import { useEffect, useRef } from "react";
import type * as Three from "three";

/**
 * First-person surface view for the helmet, built from real assets instead of
 * painted gradients:
 *
 *   Mars  — NASA/JPL Spirit 360° panorama, Poly Haven CC0 "Cracked Red Ground",
 *           four photogrammetry boulders, dust haze and a butterscotch sky.
 *   Moon  — NASA Apollo 11 Tranquility Base panorama (32 454 px original),
 *           Poly Haven CC0 "Dark Rock", the same scanned rocks, black sky with
 *           stars, no atmosphere and hard, unfiltered sunlight.
 *
 * A low Sun with a real shadow map does most of the work: rocks throw long
 * shadows across the regolith, which is what makes the panorama read as depth.
 *
 * Assets: apps/crew-tablet/scripts/fetch-mars-assets.py
 * Licences: ATTRIBUTIONS.md
 */
const BASE = import.meta.env.BASE_URL;

export type SurfaceBody = "mars" | "moon";

interface SurfaceConfig {
  panorama: string;
  groundDiffuse: string;
  groundNormal: string;
  groundArm?: string;
  fog: { color: number; density: number };
  sky: { top: number; horizon: number; below: number };
  sun: { color: number; intensity: number; position: [number, number, number] };
  hemi: { sky: number; ground: number; intensity: number };
  /** Base RGB for the large-scale ground albedo variation. */
  albedo: [number, number, number];
  albedoSpread: [number, number, number];
  rockTint: number;
  dust: boolean;
  stars: boolean;
  exposure: number;
  /** Vertical extent of the panorama band, in metres at panoRadius. */
  panoHeight: number;
  /** Turn the panorama so its stitching/artefact edge sits behind the camera. */
  panoRotation: number;
  normalScale: number;
}

const ROCKS = [
  "rocks/moon_rock_01/moon_rock_01_1k.gltf",
  "rocks/rock_07/rock_07_1k.gltf",
  "rocks/moon_rock_04/moon_rock_04_1k.gltf",
  "rocks/namaqualand_boulder_02/namaqualand_boulder_02_1k.gltf",
];

interface RockDef {
  path: string;
  count: number;
  size: [number, number];
}

const ROCK_LAYOUT: RockDef[] = [
  { path: ROCKS[0] as string, count: 16, size: [0.7, 2.4] },
  { path: ROCKS[1] as string, count: 12, size: [0.6, 2.6] },
  { path: ROCKS[2] as string, count: 14, size: [0.45, 1.8] },
  { path: ROCKS[3] as string, count: 5, size: [2.4, 5] },
];

const CONFIG: Record<SurfaceBody, SurfaceConfig> = {
  mars: {
    panorama: `${BASE}assets/mars/panorama.jpg`,
    groundDiffuse: `${BASE}assets/mars/ground/cracked_red_ground_diff_1k.jpg`,
    groundNormal: `${BASE}assets/mars/ground/cracked_red_ground_nor_gl_1k.jpg`,
    groundArm: `${BASE}assets/mars/ground/cracked_red_ground_arm_1k.jpg`,
    fog: { color: 0xc79263, density: 0.0034 },
    sky: { top: 0x8c5733, horizon: 0xd7a377, below: 0xb37c52 },
    sun: { color: 0xffdcb2, intensity: 3.4, position: [-52, 16, 26] },
    hemi: { sky: 0xe3bc93, ground: 0x5c3320, intensity: 0.9 },
    albedo: [0.62, 0.4, 0.3],
    albedoSpread: [0.34, 0.26, 0.2],
    rockTint: 0xd39a76,
    dust: true,
    stars: false,
    exposure: 1.08,
    panoHeight: 150,
    panoRotation: 0,
    normalScale: 0.4,
  },
  moon: {
    panorama: `${BASE}assets/moon/panorama.jpg`,
    groundDiffuse: `${BASE}assets/moon/ground/regolith_diff_1k.jpg`,
    groundNormal: `${BASE}assets/moon/ground/rocky_terrain_nor_gl_1k.jpg`,
    // Airless: almost no haze, a black sky, and sunlight straight out of the Sun.
    fog: { color: 0x8d8d90, density: 0.0016 },
    sky: { top: 0x000000, horizon: 0x030304, below: 0x050506 },
    sun: { color: 0xffffff, intensity: 3.0, position: [-42, 58, 30] },
    hemi: { sky: 0xd6d6da, ground: 0x2a2a2a, intensity: 0.55 },
    albedo: [0.92, 0.92, 0.94],
    albedoSpread: [0.2, 0.2, 0.21],
    rockTint: 0xb4b4b8,
    dust: false,
    stars: true,
    exposure: 1.16,
    panoHeight: 110,
    // Apollo mosaics end on a badly stitched frame; keep it out of sight.
    panoRotation: 0.2,
    normalScale: 0.22,
  },
};

/** One dune/crater field for both the mesh and rock placement. */
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

export function SurfaceScene({ body = "mars", className }: { body?: SurfaceBody; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef(body);
  bodyRef.current = body;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const config = CONFIG[body];

    let disposed = false;
    let frame = 0;
    let teardown: (() => void) | null = null;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    (async () => {
      const THREE = await import("three");
      if (disposed || !host) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(config.sky.horizon, 1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = config.exposure;
      const canvas = renderer.domElement;
      canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
      host.appendChild(canvas);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(config.fog.color, config.fog.density);

      const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.15, 1400);
      camera.position.set(0, 1.65, 0);

      const loader = new THREE.TextureLoader();
      const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

      // ---- sky -------------------------------------------------------------
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(700, 32, 16),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          fog: false,
          uniforms: {
            top: { value: new THREE.Color(config.sky.top) },
            horizon: { value: new THREE.Color(config.sky.horizon) },
            below: { value: new THREE.Color(config.sky.below) },
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

      // ---- far distance: the real surface, wrapped 360 degrees --------------
      const panoMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false });
      const pano = new THREE.Mesh(new THREE.CylinderGeometry(190, 190, config.panoHeight, 128, 1, true), panoMat);
      pano.position.y = 1.65;
      pano.renderOrder = -1;
      scene.add(pano);
      loader.load(config.panorama, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = anisotropy;
        texture.wrapS = THREE.RepeatWrapping;
        // We are inside the cylinder; flip so the panorama is not mirrored.
        texture.repeat.x = -1;
        texture.offset.x = 1 + config.panoRotation;
        panoMat.map = texture;
        panoMat.needsUpdate = true;
      });

      // ---- stars (airless bodies only) -------------------------------------
      let starField: Three.Points | null = null;
      if (config.stars) {
        const count = 1400;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          // Uniform points on a sphere: no clustering at the poles.
          const u = Math.random() * 2 - 1;
          const theta = Math.random() * Math.PI * 2;
          const r = 640;
          const s = Math.sqrt(1 - u * u);
          positions[i * 3] = r * s * Math.cos(theta);
          positions[i * 3 + 1] = Math.abs(r * u) * 0.6 + 8;
          positions[i * 3 + 2] = r * s * Math.sin(theta);
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        starField = new THREE.Points(
          starGeo,
          new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }),
        );
        scene.add(starField);
      }

      // ---- ground ----------------------------------------------------------
      const groundGeo = new THREE.CircleGeometry(184, 260, 0, Math.PI * 2);
      groundGeo.rotateX(-Math.PI / 2);
      const posAttr = groundGeo.attributes.position as Three.BufferAttribute;
      const colors = new Float32Array(posAttr.count * 3);
      const [ar, ag, ab] = config.albedo;
      const [sr, sg, sb] = config.albedoSpread;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);
        posAttr.setY(i, terrainHeight(x, z));
        // Large-scale albedo: paler dust against darker gravel/basalt.
        const n = 0.5 + 0.5 * Math.sin(x * 0.021 + 1.7) * Math.cos(z * 0.017 - 0.4);
        colors[i * 3] = ar + n * sr;
        colors[i * 3 + 1] = ag + n * sg;
        colors[i * 3 + 2] = ab + n * sb;
      }
      groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      groundGeo.computeVertexNormals();

      const diff = loader.load(config.groundDiffuse);
      diff.colorSpace = THREE.SRGBColorSpace;
      const normal = loader.load(config.groundNormal);
      const arm = config.groundArm ? loader.load(config.groundArm) : null;
      for (const tex of [diff, normal, arm]) {
        if (!tex) continue;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(14, 14);
        tex.anisotropy = anisotropy;
      }

      const ground = new THREE.Mesh(
        groundGeo,
        new THREE.MeshStandardMaterial({
          map: diff,
          normalMap: normal,
          normalScale: new THREE.Vector2(config.normalScale, config.normalScale),
          // Only the roughness channel when present: its metal channel made dust look wet.
          ...(arm ? { roughnessMap: arm } : {}),
          vertexColors: true,
          roughness: 1,
          metalness: 0,
          color: 0xffffff,
        }),
      );
      ground.receiveShadow = true;
      scene.add(ground);

      // ---- light -----------------------------------------------------------
      const sunPos = new THREE.Vector3(...config.sun.position);
      const sun = new THREE.DirectionalLight(config.sun.color, config.sun.intensity);
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
      scene.add(new THREE.HemisphereLight(config.hemi.sky, config.hemi.ground, config.hemi.intensity));

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

      const rockTint = new THREE.Color(config.rockTint);
      for (const def of ROCK_LAYOUT) {
        gltfLoader.load(
          `${BASE}assets/${body}/${def.path}`,
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
              const angle = rand() * Math.PI * 2;
              const dist = 3 + Math.pow(rand(), 0.75) * 40;
              const x = Math.cos(angle) * dist;
              const z = Math.sin(angle) * dist;
              clone.rotation.set(rand() * 0.5, rand() * Math.PI * 2, rand() * 0.4);
              // Sink a little into the regolith so the base is not a visible ring.
              clone.position.set(x, terrainHeight(x, z) - size * 0.12, z);
              rockGroup.add(clone);
            }
          },
          undefined,
          () => {
            /* A missing rock is invisible; the rest of the surface still holds. */
          },
        );
      }

      // Grit between the scans so the ground never looks swept.
      const gritMesh = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(1, 0),
        new THREE.MeshStandardMaterial({ color: config.rockTint, roughness: 0.95, flatShading: true }),
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

      // ---- airborne dust (atmosphere only) ---------------------------------
      let dust: Three.Points | null = null;
      if (config.dust) {
        const dustCount = 360;
        const dustGeo = new THREE.BufferGeometry();
        const dustPos = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
          dustPos[i * 3] = (rand() - 0.5) * 55;
          dustPos[i * 3 + 1] = rand() * 8 + 0.3;
          dustPos[i * 3 + 2] = (rand() - 0.5) * 55;
        }
        dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
        dust = new THREE.Points(
          dustGeo,
          new THREE.PointsMaterial({ color: 0xf0d3b0, size: 0.045, transparent: true, opacity: 0.5, depthWrite: false }),
        );
        scene.add(dust);
      }

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
        // Layout can change without the observer firing (fullscreen).
        resize();
        if (!reduced) {
          // Someone standing in a suit: slow sway, never perfectly still.
          camera.position.y = 1.65 + Math.sin(t * 0.5) * 0.03;
          camera.position.x = Math.sin(t * 0.13) * 0.35;
          camera.rotation.y = Math.sin(t * 0.09) * 0.14;
          camera.rotation.x = Math.sin(t * 0.21) * 0.01 - 0.02;
          camera.rotation.z = Math.sin(t * 0.17) * 0.005;
          if (dust) dust.rotation.y = t * 0.004;
          if (starField) starField.rotation.y = t * 0.002;
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
        diff.dispose();
        normal.dispose();
        arm?.dispose();
        panoMat.map?.dispose();
        renderer.dispose();
        canvas.remove();
      };
    })().catch(() => {
      // No WebGL: the gradients behind the canvas still read as a helmet.
    });

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [body]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    />
  );
}
