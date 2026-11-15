import { useEffect, useRef } from "react";
import type * as Three from "three";

/**
 * The view out of a helmet on Mars, built from real assets instead of painted
 * gradients:
 *
 *  - far distance: NASA/JPL Spirit's 360° panorama of Husband Hill (public domain)
 *  - ground: Poly Haven "Cracked Red Ground" 1K set (CC0), colour + normal + ARM
 *  - boulders: four Poly Haven photogrammetry rocks (CC0), cloned with shadows
 *  - grit: instanced pebbles filling the space between them
 *
 * A low Sun with a real shadow map does most of the work: rocks throw long
 * shadows across the regolith, which is what makes the panorama read as depth.
 *
 * Asset provenance lives in scripts/fetch-mars-assets.py; licence notes in
 * ATTRIBUTIONS.md.
 */
const BASE = import.meta.env.BASE_URL;
const PANORAMA = `${BASE}assets/mars/panorama.jpg`;
const GROUND_DIFF = `${BASE}assets/mars/ground/cracked_red_ground_diff_1k.jpg`;
const GROUND_NORMAL = `${BASE}assets/mars/ground/cracked_red_ground_nor_gl_1k.jpg`;
const GROUND_ARM = `${BASE}assets/mars/ground/cracked_red_ground_arm_1k.jpg`;

interface RockDef {
  path: string;
  count: number;
  min: number;
  max: number;
  size: [number, number];
}

const ROCKS: RockDef[] = [
  { path: `${BASE}assets/mars/rocks/moon_rock_01/moon_rock_01_1k.gltf`, count: 16, min: 2.5, max: 18, size: [0.7, 2.4] },
  { path: `${BASE}assets/mars/rocks/rock_07/rock_07_1k.gltf`, count: 12, min: 3, max: 24, size: [0.6, 2.6] },
  { path: `${BASE}assets/mars/rocks/moon_rock_04/moon_rock_04_1k.gltf`, count: 14, min: 2, max: 15, size: [0.45, 1.8] },
  {
    path: `${BASE}assets/mars/rocks/namaqualand_boulder_02/namaqualand_boulder_02_1k.gltf`,
    count: 5,
    min: 6,
    max: 28,
    size: [2.4, 5],
  },
];

/** One dune field for both the mesh and rock placement, so nothing floats. */
function terrainHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const base =
    Math.sin(x * 0.035) * Math.cos(z * 0.031) * 1.8 +
    Math.sin(x * 0.085 + z * 0.062) * 0.6 +
    Math.cos(z * 0.14 - x * 0.05) * 0.2 +
    Math.sin(x * 0.29) * Math.sin(z * 0.26) * 0.08;
  // Flat where the crew stands, so the ground underfoot matches the horizon.
  return base * Math.min(1, d / 16) - 0.05;
}

export function MarsScene({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let teardown: (() => void) | null = null;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    (async () => {
      const THREE = await import("three");
      if (disposed || !host) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(0xc08a5a, 1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      const canvas = renderer.domElement;
      canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
      host.appendChild(canvas);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xc79263, 0.0034);

      const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.15, 1400);
      camera.position.set(0, 1.65, 0);

      const loader = new THREE.TextureLoader();
      const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

      // ---- sky: thin butterscotch air -------------------------------------
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(700, 32, 16),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          fog: false,
          uniforms: {
            top: { value: new THREE.Color(0x8c5733) },
            horizon: { value: new THREE.Color(0xd7a377) },
            below: { value: new THREE.Color(0xb37c52) },
          },
          vertexShader: `
            varying float vH;
            void main() {
              vH = normalize(position).y;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 top; uniform vec3 horizon; uniform vec3 below;
            varying float vH;
            void main() {
              vec3 c = vH > 0.0
                ? mix(horizon, top, smoothstep(0.0, 0.55, vH))
                : mix(horizon, below, smoothstep(0.0, -0.2, vH));
              gl_FragColor = vec4(c, 1.0);
            }
          `,
        }),
      );
      scene.add(sky);

      // ---- far distance: the real surface, wrapped 360 degrees -------------
      const panoMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false });
      const pano = new THREE.Mesh(new THREE.CylinderGeometry(190, 190, 150, 128, 1, true), panoMat);
      pano.position.y = 1.65;
      pano.renderOrder = -1;
      scene.add(pano);
      loader.load(PANORAMA, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = anisotropy;
        texture.wrapS = THREE.RepeatWrapping;
        // We are inside the cylinder; flip so the panorama is not mirrored.
        texture.repeat.x = -1;
        texture.offset.x = 1;
        panoMat.map = texture;
        panoMat.needsUpdate = true;
      });

      // ---- ground ----------------------------------------------------------
      const groundGeo = new THREE.CircleGeometry(184, 260, 0, Math.PI * 2);
      groundGeo.rotateX(-Math.PI / 2);
      const posAttr = groundGeo.attributes.position as Three.BufferAttribute;
      const colors = new Float32Array(posAttr.count * 3);
      const tint = new THREE.Color();
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);
        posAttr.setY(i, terrainHeight(x, z));
        // Large-scale albedo: pale dust seas against darker basalt gravel.
        const n = 0.5 + 0.5 * Math.sin(x * 0.021 + 1.7) * Math.cos(z * 0.017 - 0.4);
        tint.setRGB(0.62 + n * 0.34, 0.4 + n * 0.26, 0.3 + n * 0.2);
        colors[i * 3] = tint.r;
        colors[i * 3 + 1] = tint.g;
        colors[i * 3 + 2] = tint.b;
      }
      groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      groundGeo.computeVertexNormals();

      const diff = loader.load(GROUND_DIFF);
      diff.colorSpace = THREE.SRGBColorSpace;
      const normal = loader.load(GROUND_NORMAL);
      const arm = loader.load(GROUND_ARM);
      for (const tex of [diff, normal, arm]) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(14, 14);
        tex.anisotropy = anisotropy;
      }

      const ground = new THREE.Mesh(
        groundGeo,
        new THREE.MeshStandardMaterial({
          map: diff,
          normalMap: normal,
          normalScale: new THREE.Vector2(0.4, 0.4),
          // Only the roughness channel: its metal channel is what made dust look wet.
          roughnessMap: arm,
          vertexColors: true,
          roughness: 1,
          metalness: 0,
          color: 0xffffff,
        }),
      );
      ground.receiveShadow = true;
      scene.add(ground);

      // ---- light: a small, low, distant Sun -------------------------------
      const sunPos = new THREE.Vector3(-52, 16, 26);
      const sun = new THREE.DirectionalLight(0xffdcb2, 3.4);
      sun.position.copy(sunPos);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 5;
      sun.shadow.camera.far = 200;
      sun.shadow.camera.left = -60;
      sun.shadow.camera.right = 60;
      sun.shadow.camera.top = 60;
      sun.shadow.camera.bottom = -60;
      sun.shadow.bias = -0.0005;
      sun.shadow.normalBias = 0.03;
      scene.add(sun);
      scene.add(new THREE.HemisphereLight(0xe3bc93, 0x5c3320, 0.9));

      const sunDisc = new THREE.Mesh(
        new THREE.CircleGeometry(3.2, 32),
        new THREE.MeshBasicMaterial({ color: 0xfff6e4, transparent: true, opacity: 0.95, fog: false }),
      );
      sunDisc.position.copy(sunPos).normalize().multiplyScalar(520);
      sunDisc.lookAt(0, 1.65, 0);
      scene.add(sunDisc);

      // ---- rocks: photogrammetry, cloned, casting shadows ------------------
      let seed = 20261115;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed) return;
      const gltfLoader = new GLTFLoader();
      const rockGroup = new THREE.Group();
      scene.add(rockGroup);

      const placeOnGround = (object: Three.Object3D, size: number) => {
        const angle = rand() * Math.PI * 2;
        const dist = 3 + Math.pow(rand(), 0.75) * 40;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        object.rotation.set(rand() * 0.5, rand() * Math.PI * 2, rand() * 0.4);
        // Sink a little into the regolith so the base is not a visible ring.
        object.position.set(x, terrainHeight(x, z) - size * 0.12, z);
      };

      // Rust tint: the scans are Earth-grey, Mars dust is not.
      const rockTint = new THREE.Color(0xd39a76);

      for (const def of ROCKS) {
        gltfLoader.load(
          def.path,
          (gltf) => {
            if (disposed) return;
            const source = gltf.scene;
            const box = new THREE.Box3().setFromObject(source);
            const span = new THREE.Vector3();
            box.getSize(span);
            const base = Math.max(span.x, span.y, span.z) || 1;

            for (let i = 0; i < def.count; i++) {
              const size = def.size[0] + rand() * (def.size[1] - def.size[0]);
              const clone = source.clone(true);
              clone.scale.setScalar(size / base);
              clone.traverse((child) => {
                const mesh = child as Three.Mesh;
                if (!mesh.isMesh) return;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                const material = (mesh.material as Three.MeshStandardMaterial).clone();
                material.color = rockTint.clone().multiplyScalar(0.75 + rand() * 0.35);
                mesh.material = material;
              });
              placeOnGround(clone, size);
              rockGroup.add(clone);
            }
          },
          undefined,
          () => {
            /* A missing rock is invisible; the rest of the surface still holds. */
          },
        );
      }

      // Grit between the scans: cheap instances so the ground never looks swept.
      const gritMesh = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(1, 0),
        new THREE.MeshStandardMaterial({ color: 0x8a5232, roughness: 0.95, flatShading: true }),
        320,
      );
      gritMesh.castShadow = true;
      gritMesh.receiveShadow = true;
      const matrix = new THREE.Matrix4();
      const quat = new THREE.Quaternion();
      const euler = new THREE.Euler();
      const vec = new THREE.Vector3();
      const scl = new THREE.Vector3();
      for (let i = 0; i < 320; i++) {
        const angle = rand() * Math.PI * 2;
        const dist = 1.5 + Math.pow(rand(), 0.6) * 22;
        const s = 0.04 + Math.pow(rand(), 2.4) * 0.22;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        euler.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
        quat.setFromEuler(euler);
        scl.set(s, s * (0.5 + rand() * 0.6), s);
        vec.set(x, terrainHeight(x, z) + s * 0.25, z);
        matrix.compose(vec, quat, scl);
        gritMesh.setMatrixAt(i, matrix);
      }
      gritMesh.instanceMatrix.needsUpdate = true;
      scene.add(gritMesh);

      // ---- airborne dust ---------------------------------------------------
      const dustCount = 360;
      const dustGeo = new THREE.BufferGeometry();
      const dustPos = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] = (rand() - 0.5) * 55;
        dustPos[i * 3 + 1] = rand() * 8 + 0.3;
        dustPos[i * 3 + 2] = (rand() - 0.5) * 55;
      }
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
      const dust = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({ color: 0xf0d3b0, size: 0.045, transparent: true, opacity: 0.5, depthWrite: false }),
      );
      scene.add(dust);

      // ---- sizing ----------------------------------------------------------
      let lastW = 0;
      let lastH = 0;
      const resize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        if (w === lastW && h === lastH) return;
        lastW = w;
        lastH = h;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      // ---- loop ------------------------------------------------------------
      const clock = new THREE.Clock();
      let running = true;
      const onVisibility = () => {
        running = !document.hidden;
      };
      document.addEventListener("visibilitychange", onVisibility);

      const render = () => {
        const t = clock.getElapsedTime();
        // Belt and braces: layout can change without the observer firing (fullscreen).
        resize();
        if (!reduced) {
          // Someone standing in a suit: slow sway, never perfectly still.
          camera.position.y = 1.65 + Math.sin(t * 0.5) * 0.03;
          camera.position.x = Math.sin(t * 0.13) * 0.35;
          camera.rotation.y = Math.sin(t * 0.09) * 0.14;
          camera.rotation.x = Math.sin(t * 0.21) * 0.01 - 0.02;
          camera.rotation.z = Math.sin(t * 0.17) * 0.005;
          dust.rotation.y = t * 0.004;
        }
        if (running) renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      render();

      teardown = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        scene.traverse((object) => {
          const mesh = object as Three.Mesh;
          mesh.geometry?.dispose();
          const material = mesh.material as Three.Material | Three.Material[] | undefined;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material?.dispose();
        });
        for (const tex of [diff, normal, arm]) tex.dispose();
        panoMat.map?.dispose();
        renderer.dispose();
        canvas.remove();
      };
    })().catch(() => {
      // No WebGL: the amber gradients behind the canvas still read as a helmet.
    });

    return () => {
      disposed = true;
      teardown?.();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    />
  );
}
