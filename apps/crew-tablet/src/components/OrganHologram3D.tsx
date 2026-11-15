import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { heartScale } from "../lib/heartMotion";

export interface OrganHologram3DProps {
  organName: string;
  classification?: string;
  fallbackGeometry?: THREE.BufferGeometry;
  heartRateBpm?: number | null;
}

// Map canonical organ names to GLB files in /assets/organs/
const GLB_FILE_MAP: Record<string, string> = {
  brain: "brain.glb",
  heart: "heart.glb",
  liver: "liver.glb",
  "left kidney": "kidney_left.glb",
  "right kidney": "kidney_right.glb",
  kidney: "kidney_left.glb",
  kidney_left: "kidney_left.glb",
  kidney_right: "kidney_right.glb",
  lung: "lung.glb",
  lungs: "lung.glb",
  uterus: "uterus.glb",
};

/**
 * The lung reference asset is a left+right pair, so a single-side request keeps
 * the body mesh: showing both lungs under a "left lung" heading would misstate
 * laterality, which matters for interpretation.
 */
const PAIRED_ASSETS = new Set(["left lung", "right lung"]);

/**
 * Tissue colours approximating the living organ, used instead of the asset's
 * own base colour where that colour is near-black (liver) or carries no tissue
 * information. Values are sRGB; the renderer tonemaps them.
 */
const ORGAN_TISSUE: Record<string, { base: number; deep: number }> = {
  brain: { base: 0xd7b3a1, deep: 0xc79c8a },
  heart: { base: 0xa33b33, deep: 0x8a2c26 },
  liver: { base: 0x7b3a2b, deep: 0x63291e },
  lung: { base: 0xdb9a96, deep: 0xcb8783 },
  kidney: { base: 0x9c4a3d, deep: 0x83392e },
  uterus: { base: 0xb26a72, deep: 0x965158 },
};

/** Pale structures that must not be painted with the parenchyma colour. */
const PALE_STRUCTURES = /ligament|tendon|fascia|septum|cartilage|bronch|trachea|pericard/;

/**
 * Display orientation. The reference meshes are authored in body space, where
 * the heart's base-to-apex axis lies ~40 degrees from vertical and the uterus
 * lies almost horizontally over the bladder. Isolated in a viewer without the
 * rest of the body that reads as an organ lying on its side, so each organ is
 * turned to the upright presentation used in anatomy illustrations. The angles
 * come from the principal axis of each mesh (dominant eigenvector of its vertex
 * covariance), measured in body space.
 */
const ORGAN_ORIENTATION_DEG: Record<string, [number, number, number]> = {
  heart: [40, 0, 0],
  uterus: [-60, 0, 0],
};

/** Shared so the effect dependency stays referentially stable. */
const UPRIGHT: [number, number, number] = [0, 0, 0];

// Global cache for loaded GLTF scenes to avoid re-parsing on repeated selection
const gltfSceneCache = new Map<string, THREE.Group>();

function organKey(normName: string): string | null {
  if (normName.includes("brain")) return "brain";
  if (normName.includes("heart")) return "heart";
  if (normName.includes("liver")) return "liver";
  if (normName.includes("lung")) return "lung";
  if (normName.includes("kidney")) return "kidney";
  if (normName.includes("uterus")) return "uterus";
  return null;
}

/** Tissue colour for one mesh, keeping recognisable pale structures pale. */
function tissueColor(key: string | null, materialName: string | undefined): THREE.Color {
  const tissue = key ? ORGAN_TISSUE[key] : undefined;
  const base = new THREE.Color(tissue?.base ?? 0xb4746a);
  if (materialName && PALE_STRUCTURES.test(materialName)) {
    return new THREE.Color(0xcabda6);
  }
  if (materialName && /capsule|pyramid|medulla|cortex|mucosa/i.test(materialName)) {
    return new THREE.Color(tissue?.deep ?? base);
  }
  return base;
}

export function OrganHologram3D({
  organName,
  classification = "reference",
  fallbackGeometry,
  heartRateBpm = null,
}: OrganHologram3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [assetType, setAssetType] = useState<"glb" | "geometry" | "illustration" | "unavailable">("unavailable");
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? "light");

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme ?? "light"));
    observer.observe(document.documentElement, {attributes:true, attributeFilter:["data-theme"]});
    return () => observer.disconnect();
  }, []);

  const wireframeRef = useRef(wireframe);
  wireframeRef.current = wireframe;
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const heartRateRef = useRef(heartRateBpm);
  heartRateRef.current = heartRateBpm;
  // Tissue materials are rebuilt with the scene, so the wireframe toggle is
  // applied to the live materials instead of reloading the model.
  const applyWireframeRef = useRef<(enabled: boolean) => void>(() => {});

  // Wireframe is a program-level flag: set it on the live materials straight
  // away instead of waiting for a rendered frame.
  useEffect(() => {
    applyWireframeRef.current(wireframe);
  }, [wireframe]);

  // Resolve status colour for the hologram reticle
  const holoColorHex = theme === "light"
    ? classification === "mild_strain" ? 0xa94928 : classification === "sustained_deviation" ? 0x96600a : 0x514bd0
    :
    classification === "mild_strain"
      ? 0xf87171 // soft red/coral
      : classification === "sustained_deviation"
        ? 0xfbbf24 // amber
        : classification === "adapted_nominal"
          ? 0x34d399 // emerald
          : 0xb4afff;

  // Determine GLB filename
  const normName = (organName || "").toLowerCase().trim();
  let glbFile: string | null = null;
  if (!PAIRED_ASSETS.has(normName)) {
    for (const [key, file] of Object.entries(GLB_FILE_MAP)) {
      if (normName === key) { glbFile = file; break; }
    }
  }

  const organTissueKey = organKey(normName);
  const orientationDeg = (organTissueKey ? ORGAN_ORIENTATION_DEG[organTissueKey] : undefined) ?? UPRIGHT;

  // Ref to reset angle
  const resetAngleRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let stopped = false;
    let animId: number;

    const width = container.clientWidth || 340;
    const height = 185;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.55, 3.4);
    camera.lookAt(0, 0, 0);

    // Renderer (uses the React-managed canvas directly — NO innerHTML, NO appendChild)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
    } catch (e) {
      console.warn("Could not create WebGLRenderer for OrganHologram3D:", e);
      return;
    }

    // Lights. Kept close to neutral: brighter values blow the tissue colours out
    // into the flat, stone-like look this viewer used to have.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(2, 3, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xc8d8ef, 0.55);
    dirLight2.position.set(-2, -1, -2);
    scene.add(dirLight2);

    // Holographic Pedestal / Reticle
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -0.95, 0);

    // Concentric rings
    const ringGeo1 = new THREE.RingGeometry(0.7, 0.72, 48);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: holoColorHex,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2;
    pedestalGroup.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(1.05, 1.07, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    pedestalGroup.add(ring2);

    // Crosshair axes on floor
    const axisMat = new THREE.LineBasicMaterial({
      color: holoColorHex,
      transparent: true,
      opacity: 0.2,
    });
    const axisGeoX = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.1, 0, 0),
      new THREE.Vector3(1.1, 0, 0),
    ]);
    const axisGeoZ = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -1.1),
      new THREE.Vector3(0, 0, 1.1),
    ]);
    pedestalGroup.add(new THREE.Line(axisGeoX, axisMat));
    pedestalGroup.add(new THREE.Line(axisGeoZ, axisMat));

    scene.add(pedestalGroup);

    // Model Pivot Group — carries the user's drag rotation
    const pivot = new THREE.Group();
    scene.add(pivot);

    // Keep references so the wireframe toggle can reach these materials
    const tissueMaterials: THREE.Material[] = [];
    applyWireframeRef.current = (enabled: boolean) => {
      for (const material of tissueMaterials) {
        const standard = material as THREE.MeshPhysicalMaterial;
        standard.wireframe = enabled;
        standard.transparent = enabled;
        standard.opacity = enabled ? 0.55 : 1;
        standard.needsUpdate = true;
      }
    };
    const ownedGeometries: THREE.BufferGeometry[] = [];

    /**
     * Opaque, double-sided tissue. Opaque keeps the depth buffer honest (the
     * old transparent material let back faces paint over front faces, which is
     * what produced the "holes"), and double-sided fills the open hilum and
     * section surfaces the reference meshes actually have so they read as
     * anatomy rather than as a hole through the organ.
     */
    const makeTissueMaterial = (color: THREE.Color): THREE.MeshPhysicalMaterial => {
      const material = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.62,
        metalness: 0,
        clearcoat: 0.18,
        clearcoatRoughness: 0.6,
        sheen: 0.3,
        sheenColor: new THREE.Color(0xffd7cf),
        side: THREE.DoubleSide,
        flatShading: false,
        transparent: wireframeRef.current,
        opacity: wireframeRef.current ? 0.55 : 1,
        wireframe: wireframeRef.current,
      });
      tissueMaterials.push(material);
      return material;
    };

    // Reset angle handler
    resetAngleRef.current = () => {
      pivot.rotation.set(0, 0, 0);
    };

    // Load or create organ 3D model
    const loadModel = async () => {
      setLoading(true);

      const attachGeometry = (geom: THREE.BufferGeometry, materialName?: string) => {
        const material = makeTissueMaterial(tissueColor(organTissueKey, materialName));
        const mesh = new THREE.Mesh(geom, material);

        geom.computeBoundingBox();
        if (geom.boundingBox) {
          const center = new THREE.Vector3();
          geom.boundingBox.getCenter(center);
          const size = new THREE.Vector3();
          geom.boundingBox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            mesh.scale.multiplyScalar(1.6 / maxDim);
          }
          mesh.position.sub(center.multiplyScalar(maxDim > 0 ? 1.6 / maxDim : 1));
        }

        pivot.add(mesh);
      };

      try {
        if (normName.includes("eyeball") || normName === "eyes") {
          // An illustrative globe makes the iris visible; it is not an eye scan.
          setAssetType("illustration");
          const globe = new THREE.Mesh(
            new THREE.SphereGeometry(0.75, 48, 32),
            new THREE.MeshStandardMaterial({color: 0xf2ece8, roughness: 0.38, side: THREE.DoubleSide})
          );
          const iris = new THREE.Mesh(
            new THREE.CircleGeometry(0.25, 48),
            new THREE.MeshStandardMaterial({color: 0x65839b, roughness: 0.5, side: THREE.DoubleSide})
          );
          iris.position.z = 0.752;
          const pupil = new THREE.Mesh(
            new THREE.CircleGeometry(0.105, 48),
            new THREE.MeshStandardMaterial({color: 0x171e27, roughness: 0.4, side: THREE.DoubleSide})
          );
          pupil.position.z = 0.754;
          pivot.add(globe, iris, pupil);
          ownedGeometries.push(globe.geometry, iris.geometry, pupil.geometry);
          tissueMaterials.push(globe.material, iris.material, pupil.material);
        } else if (glbFile) {
          // The NIH/HRA reference mesh is preferred: the body mesh kept in the
          // anatomy payload is a decimated copy that shows tearing and holes at
          // close range.
          setAssetType("glb");
          const glbUrl = `${import.meta.env.BASE_URL}assets/organs/${glbFile}`;

          let modelScene: THREE.Group;
          if (gltfSceneCache.has(glbUrl)) {
            modelScene = gltfSceneCache.get(glbUrl)!.clone(true);
          } else {
            const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(glbUrl);
            gltfSceneCache.set(glbUrl, gltf.scene);
            modelScene = gltf.scene.clone(true);
          }

          if (stopped) return;

          // Give every part its tissue colour, preserving pale ligaments,
          // cartilage and the deeper capsule/medulla tones.
          modelScene.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh) {
              const sourceName = (mesh.material as THREE.Material | undefined)?.name;
              mesh.material = makeTissueMaterial(tissueColor(organTissueKey, sourceName));
            }
          });

          // Normalize size and center
          const box = new THREE.Box3().setFromObject(modelScene);
          const center = new THREE.Vector3();
          box.getCenter(center);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            modelScene.scale.multiplyScalar(1.65 / maxDim);
          }

          // Translation must follow scale: the source centre also scales.
          modelScene.position.sub(center.multiplyScalar(maxDim > 0 ? 1.65 / maxDim : 1));

          // The display rotation goes on a wrapper: rotating the centred model
          // itself would also rotate its centring offset and swing it off frame.
          const oriented = new THREE.Group();
          oriented.rotation.set(
            THREE.MathUtils.degToRad(orientationDeg[0]),
            THREE.MathUtils.degToRad(orientationDeg[1]),
            THREE.MathUtils.degToRad(orientationDeg[2])
          );
          oriented.add(modelScene);
          pivot.add(oriented);
        } else if (fallbackGeometry && fallbackGeometry.attributes?.position) {
          // Geometry from body anatomy.json/bin
          try {
            setAssetType("geometry");
            const geom = fallbackGeometry.clone();
            ownedGeometries.push(geom);
            if (!geom.getAttribute("normal")) geom.computeVertexNormals();
            attachGeometry(geom, normName);
          } catch (geoErr) {
            console.warn("Anatomical reference geometry could not be displayed:", geoErr);
            setAssetType("unavailable");
          }
        } else {
          setAssetType("unavailable");
        }
      } catch (err) {
        console.warn("Could not load organ reference model:", err);
        // The panel still has the body mesh: use it rather than an empty frame.
        if (!stopped && fallbackGeometry?.attributes?.position) {
          try {
            setAssetType("geometry");
            const geom = fallbackGeometry.clone();
            ownedGeometries.push(geom);
            if (!geom.getAttribute("normal")) geom.computeVertexNormals();
            attachGeometry(geom, normName);
            return;
          } catch (geoErr) {
            console.warn("Anatomical reference geometry could not be displayed:", geoErr);
          }
        }
        if (!stopped) setAssetType("unavailable");
      } finally {
        if (!stopped) setLoading(false);
      }
    };

    loadModel();

    // Interactive Drag to Rotate
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      canvas.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      pivot.rotation.y += dx * 0.015;
      pivot.rotation.x = Math.max(-0.6, Math.min(0.6, pivot.rotation.x + dy * 0.012));
    };

    const onPointerUp = () => {
      isDragging = false;
      canvas.style.cursor = "grab";
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Animation Loop
    const clock = new THREE.Clock();
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animate = () => {
      if (stopped) return;
      animId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.elapsedTime;
      const reducedMotion = motionPreference.matches;

      // Auto-rotation if enabled and not currently dragging
      if (!reducedMotion && autoRotateRef.current && !isDragging) {
        pivot.rotation.y += delta * 0.3;
      }

      // Pedestal counter-rotation for the holographic effect
      if (!reducedMotion) pedestalGroup.rotation.y -= delta * 0.09;

      // Subtle levitation
      pivot.position.y = reducedMotion ? 0 : Math.sin(elapsedTime * 2.0) * 0.035;
      pivot.scale.setScalar(heartScale(normName, heartRateRef.current, performance.now() / 1000, reducedMotion));

      renderer.render(scene, camera);
    };

    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width;
        if (newW > 0) {
          camera.aspect = newW / height;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, height, false);
        }
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      stopped = true;
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      tissueMaterials.forEach((material) => material.dispose());
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ringGeo1.dispose(); ringGeo2.dispose(); ringMat1.dispose(); ringMat2.dispose();
      axisGeoX.dispose(); axisGeoZ.dispose(); axisMat.dispose();
      renderer.dispose();
      scene.clear();
      applyWireframeRef.current = () => {};
    };
  }, [glbFile, fallbackGeometry, holoColorHex, normName, organTissueKey, orientationDeg]);

  return (
    <div className="organ-hologram" aria-label={`3D reference model of ${organName}`} data-organ={normName} data-asset={assetType} data-geometry={fallbackGeometry?.name}>
      {/* Sci-fi HUD Header */}
      <div className="organ-hologram__hud-top">
        <div className="organ-hologram__badge">
          <span className="organ-hologram__pulse-dot" />
          <span className="organ-hologram__badge-text">
            3D REFERENCE MODEL · {assetType === "glb" ? "GLB ASSET" : assetType === "geometry" ? "ANATOMY MESH" : assetType === "illustration" ? "ILLUSTRATIVE EYE" : "UNAVAILABLE"}
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="organ-hologram__controls">
          <button
            type="button"
            className={`organ-hologram__btn ${wireframe ? "is-active" : ""}`}
            onClick={() => setWireframe((v) => !v)}
            title="Toggle wireframe mode"
            aria-label="Toggle wireframe mode"
            aria-pressed={wireframe}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 2" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span>{wireframe ? "Wire" : "Solid"}</span>
          </button>

          <button
            type="button"
            className={`organ-hologram__btn ${autoRotate ? "is-active" : ""}`}
            onClick={() => setAutoRotate((v) => !v)}
            title="Toggle auto-rotation"
            aria-label="Toggle auto-rotation"
            aria-pressed={autoRotate}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              {autoRotate ? (
                <>
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </>
              ) : (
                <polygon points="5 3 19 12 5 21 5 3" />
              )}
            </svg>
            <span>{autoRotate ? "Orbit" : "Pause"}</span>
          </button>

          <button
            type="button"
            className="organ-hologram__btn"
            onClick={() => resetAngleRef.current?.()}
            title="Reset rotation angle"
            aria-label="Reset rotation angle"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <polyline points="3 3 3 8 8 8" />
            </svg>
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 3D Viewport container */}
      <div className="organ-hologram__viewport" ref={containerRef}>
        <canvas ref={canvasRef} className="organ-hologram__canvas" tabIndex={-1} aria-hidden="true" />

        {loading ? (
          <div className="organ-hologram__loader">
            <span className="organ-hologram__spinner" />
            <span>Projecting holographic bio-mesh…</span>
          </div>
        ) : null}
        {!loading && assetType === "unavailable" ? <div className="organ-hologram__loader" role="status">Reference model unavailable for this organ.</div> : null}

        {/* Scanline beam visual effect */}
        <div className="organ-hologram__scanbeam" aria-hidden="true" />
      </div>

      {/* HUD Footer status bar */}
      <div className="organ-hologram__hud-bottom">
        <span className="organ-hologram__reticle-hint">Drag to inspect 360° · Real-time WebGL</span>
        <span className="organ-hologram__status-tag">
          {classification === "mild_strain"
            ? "Simulated strain"
            : classification === "sustained_deviation"
              ? "Simulated deviation"
              : classification === "adapted_nominal" ? "Simulated adaptation" : "Anatomical reference"}
        </span>
      </div>
    </div>
  );
}
