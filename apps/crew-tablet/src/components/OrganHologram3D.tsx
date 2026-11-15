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
  "left lung": "lung.glb",
  "right lung": "lung.glb",
  uterus: "uterus.glb",
};

// Global cache for loaded GLTF scenes to avoid re-parsing on repeated selection
const gltfSceneCache = new Map<string, THREE.Group>();

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
  const [assetType, setAssetType] = useState<"glb" | "geometry" | "procedural">("glb");

  const wireframeRef = useRef(wireframe);
  wireframeRef.current = wireframe;
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const heartRateRef = useRef(heartRateBpm);
  heartRateRef.current = heartRateBpm;

  // Resolve status color for the hologram
  const holoColorHex =
    classification === "mild_strain"
      ? 0xf87171 // soft red/coral
      : classification === "sustained_deviation"
        ? 0xfbbf24 // amber
        : classification === "adapted_nominal"
          ? 0x34d399 // emerald
          : 0x38bdf8; // cyan

  // Determine GLB filename
  const normName = (organName || "").toLowerCase().trim();
  let glbFile: string | null = null;
  for (const [key, file] of Object.entries(GLB_FILE_MAP)) {
    if (normName === key || normName.includes(key) || key.includes(normName)) {
      glbFile = file;
      break;
    }
  }

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
    camera.position.set(0, 0.8, 3.2);
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
      renderer.toneMappingExposure = 1.2;
    } catch (e) {
      console.warn("Could not create WebGLRenderer for OrganHologram3D:", e);
      return;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0f2744, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(holoColorHex, 2.2);
    dirLight1.position.set(2, 3, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 1.2);
    dirLight2.position.set(-2, -1, -2);
    scene.add(dirLight2);

    // Holographic Pedestal / Reticle
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -0.9, 0);

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

    // Model Pivot Group
    const pivot = new THREE.Group();
    scene.add(pivot);

    // Keep references to update materials on wireframe toggle
    const holoMaterials: THREE.MeshStandardMaterial[] = [];
    const wireMeshes: THREE.Mesh[] = [];

    // Reset angle handler
    resetAngleRef.current = () => {
      pivot.rotation.set(0, 0, 0);
    };

    // Load or create organ 3D model
    const loadModel = async () => {
      setLoading(true);

      try {
        // The selected body's geometry preserves side, shape and reference
        // provenance. Standalone assets are used only when that mesh is absent.
        if (glbFile && !fallbackGeometry?.attributes?.position) {
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

          // Apply holographic shaders & wireframe accents
          modelScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const holoMat = new THREE.MeshStandardMaterial({
                color: holoColorHex,
                emissive: holoColorHex,
                emissiveIntensity: 0.45,
                roughness: 0.25,
                metalness: 0.5,
                transparent: true,
                opacity: wireframeRef.current ? 0.08 : 0.82,
                wireframe: wireframeRef.current,
                side: THREE.DoubleSide,
              });
              holoMaterials.push(holoMat);
              mesh.material = holoMat;

              // Add subtle wireframe overlay
              if (mesh.geometry) {
                const wireMat = new THREE.MeshBasicMaterial({
                  color: 0xbae6fd,
                  wireframe: true,
                  transparent: true,
                  opacity: 0.3,
                });
                const wireClone = new THREE.Mesh(mesh.geometry, wireMat);
                wireMeshes.push(wireClone);
                mesh.add(wireClone);
              }
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
          pivot.add(modelScene);
        } else if (fallbackGeometry && fallbackGeometry.attributes?.position) {
          // Geometry from body anatomy.json/bin
          try {
            setAssetType("geometry");
            const geom = fallbackGeometry.clone();
            geom.computeVertexNormals();

            const holoMat = new THREE.MeshStandardMaterial({
              color: holoColorHex,
              emissive: holoColorHex,
              emissiveIntensity: 0.5,
              roughness: 0.3,
              metalness: 0.4,
              transparent: true,
              opacity: wireframeRef.current ? 0.1 : 0.85,
              wireframe: wireframeRef.current,
              side: THREE.DoubleSide,
            });
            holoMaterials.push(holoMat);

            const mesh = new THREE.Mesh(geom, holoMat);
            const wireMat = new THREE.MeshBasicMaterial({
              color: 0xbae6fd,
              wireframe: true,
              transparent: true,
              opacity: 0.32,
            });
            const wireClone = new THREE.Mesh(geom, wireMat);
            wireMeshes.push(wireClone);
            mesh.add(wireClone);

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
          } catch (geoErr) {
            console.warn("Fallback geometry failed, using procedural proxy:", geoErr);
            createProcedural();
          }
        } else {
          createProcedural();
        }
      } catch (err) {
        console.warn("Could not load organ hologram model, using procedural proxy:", err);
        createProcedural();
      } finally {
        if (!stopped) setLoading(false);
      }
    };

    function createProcedural() {
      setAssetType("procedural");
      const geo = new THREE.IcosahedronGeometry(0.85, 3);
      const holoMat = new THREE.MeshStandardMaterial({
        color: holoColorHex,
        emissive: holoColorHex,
        emissiveIntensity: 0.5,
        wireframe: wireframeRef.current,
        transparent: true,
        opacity: 0.8,
      });
      holoMaterials.push(holoMat);
      const mesh = new THREE.Mesh(geo, holoMat);

      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xbae6fd,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      mesh.add(new THREE.Mesh(geo, wireMat));
      pivot.add(mesh);
    }

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

      // Update wireframe state dynamically
      holoMaterials.forEach((m) => {
        m.wireframe = wireframeRef.current;
        m.opacity = wireframeRef.current ? 0.15 : 0.82;
      });
      wireMeshes.forEach((w) => {
        w.visible = !wireframeRef.current;
      });

      // Auto-rotation if enabled and not currently dragging
      if (!reducedMotion && autoRotateRef.current && !isDragging) {
        pivot.rotation.y += delta * 0.3;
      }

      // Pedestal counter-rotation for high-tech holographic effect
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
      renderer.dispose();
      scene.clear();
    };
  }, [glbFile, fallbackGeometry, holoColorHex]);

  return (
    <div className="organ-hologram" aria-label={`3D reference model of ${organName}`}>
      {/* Sci-fi HUD Header */}
      <div className="organ-hologram__hud-top">
        <div className="organ-hologram__badge">
          <span className="organ-hologram__pulse-dot" />
          <span className="organ-hologram__badge-text">
            3D REFERENCE MODEL · {assetType === "glb" ? "GLB ASSET" : assetType === "geometry" ? "ANATOMY MESH" : "PROCEDURAL"}
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

        {/* Scanline beam visual effect */}
        <div className="organ-hologram__scanbeam" aria-hidden="true" />
      </div>

      {/* HUD Footer status bar */}
      <div className="organ-hologram__hud-bottom">
        <span className="organ-hologram__reticle-hint">Drag to inspect 360° · Real-time WebGL</span>
        <span className="organ-hologram__status-tag">
          {classification === "mild_strain"
            ? "⚡ BIO-STRAIN ALERT"
            : classification === "sustained_deviation"
              ? "▲ ELEVATED DEVIATION"
              : "✓ ZERO-G ADAPTED"}
        </span>
      </div>
    </div>
  );
}
