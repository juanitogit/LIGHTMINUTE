import { useEffect, useMemo, useRef, useState } from "react";
import type { Mesh, Material, Object3D, SkinnedMesh, Group } from "three";
import { indicatorMeta, REGION_LABEL, RISK_REGION, type BodyRegion } from "../lib/meta";
import type { Reading } from "../lib/types";
import { heartScale, scenarioHeartRate } from "../lib/heartMotion";
import { Icon } from "./Icon";
// Physiology simulation – isolated mathematical engine (no LLM, no diagnosis)
import { PhysiologySimulationEngine } from "../physiology/engine";
import { Physiology3DAdapter } from "../physiology/adapter";
import type { OrganVisualizationMap } from "../physiology/types";
import { OrganStatsPanel } from "./OrganStatsPanel";
import { ErrorBoundary } from "./ErrorBoundary";

/** Anatomically scaled anchor coordinates in world space (scaled to 2.8m). */
const ANCHORS_BY_BUILD: Record<"male" | "female", Record<BodyRegion, [number, number, number]>> = {
  male: {
    head: [0.08, 2.68, 0.16],
    eyes: [-0.08, 2.60, 0.18],
    chest: [0.15, 2.12, 0.20],
    abdomen: [-0.15, 1.75, 0.18],
    legs: [0.12, 0.82, 0.12],
  },
  female: {
    head: [0.08, 2.67, 0.15],
    eyes: [-0.08, 2.62, 0.18],
    chest: [0.15, 2.08, 0.20],
    abdomen: [-0.14, 1.70, 0.17],
    legs: [0.11, 0.78, 0.12],
  },
};

type SurfaceDef = {
  name: string;
  pos: number;
  verts: number;
  idx: number;
  tris: number;
  nrm?: number;
  center?: [number, number, number];
};

type BodyDef = {
  attribution: string;
  height: number;
  skin: SurfaceDef;
  organs: SurfaceDef[];
  anchors?: Record<string, [number, number, number]>;
};

type AnatomyDescription = {
  bodies: Record<string, BodyDef>;
};

type OrganMeshRecord = {
  name: string;
  mesh: Mesh;
  blood: boolean;
  neuro: boolean;
};

/** Module-level singleton cache so geometry buffers are fetched only once per session. */
let anatomyPromise: Promise<{ description: AnatomyDescription; bytes: ArrayBuffer }> | null = null;

function loadAnatomyAssets(baseUrl: string) {
  if (!anatomyPromise) {
    const base = `${baseUrl}assets/anatomy/`;
    anatomyPromise = Promise.all([
      fetch(base + "anatomy.json").then((res) => {
        if (!res.ok) throw new Error("Missing anatomy.json");
        return res.json() as Promise<AnatomyDescription>;
      }),
      fetch(base + "anatomy.bin").then((res) => {
        if (!res.ok) throw new Error("Missing anatomy.bin");
        return res.arrayBuffer();
      }),
    ]).then(([description, bytes]) => ({ description, bytes }));
  }
  return anatomyPromise;
}

function disposeObject(object: Object3D) {
  object.traverse((child) => {
    const mesh = child as Mesh;
    (child as SkinnedMesh).skeleton?.dispose();
    mesh.geometry?.dispose();
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material: Material) => material.dispose());
    }
  });
}

/** Check whether a specific organ corresponds to an anomalous reading in personal baseline. */
function isOrganAnomalous(organName: string, readings: Record<string, Reading>): boolean {
  const norm = organName.toLowerCase();

  for (const [key, reading] of Object.entries(readings)) {
    const isUnusual = reading.lens.personal === "unusual_high" || reading.lens.personal === "unusual_low";
    if (!isUnusual) continue;

    // Cardiac specific
    if (norm.includes("heart")) {
      if (key === "rest_hr" || reading.hrp_risk === "cardiovascular") return true;
    }
    // Eyes / SANS
    if (norm.includes("eyeball") || norm.includes("eye")) {
      if (reading.hrp_risk === "vision" || key === "sans" || key === "vision_score") return true;
    }
    // Brain / Cognitive / Neurological
    if (norm.includes("brain")) {
      if (
        key === "sleep_h" ||
        key === "pvt_ms" ||
        key === "headache_score" ||
        reading.hrp_risk === "behavioral" ||
        reading.hrp_risk === "sensorimotor"
      ) {
        return true;
      }
    }
    // Lungs / Respiratory / CO2
    if (norm.includes("lung")) {
      if (key === "co2_ppm" || reading.hrp_risk === "respiratory" || reading.hrp_risk === "environment") return true;
    }
    // Kidneys
    if (norm.includes("kidney")) {
      if (reading.hrp_risk === "renal" || key.includes("kidney") || key.includes("hydration")) return true;
    }
    // Liver / Immune
    if (norm.includes("liver")) {
      if (reading.hrp_risk === "immune" || key.includes("crp") || key.includes("liver")) return true;
    }
    // Jugular / Aorta (cephalad fluid shift, vascular strain)
    if (norm.includes("jugular")) {
      if (key === "headache_score" || reading.hrp_risk === "cardiovascular") return true;
    }
    if (norm.includes("aorta")) {
      if (reading.hrp_risk === "cardiovascular" && key !== "rest_hr") return true;
    }
    // Spine / Musculoskeletal
    if (norm.includes("spinal") || norm.includes("vertebral")) {
      if (reading.hrp_risk === "muscular" || reading.hrp_risk === "bone") return true;
    }

    // Core temperature affects central vital organs (fever / thermal strain)
    if (key === "temp_c" && (norm.includes("heart") || norm.includes("brain") || norm.includes("liver"))) {
      return true;
    }
  }

  return false;
}

/**
 * Builds a physiological visual map from current sensor readings.
 * Uses PhysiologySimulationEngine + Physiology3DAdapter.
 * [DATOS REALES] where measured, [SIMULADO] where modelled.
 * Never produces diagnosis; engine is deterministic, LLM is not involved.
 */
function buildPhysioVisualMap(readings: Record<string, Reading>, missionDay: number): OrganVisualizationMap {
  try {
    const sensors: Record<string, { value: number; hrp_risk?: string }> = {};
    for (const [key, r] of Object.entries(readings)) {
      sensors[key] = { value: r.value, hrp_risk: r.hrp_risk };
    }

    const co2Reading = sensors["co2_ppm"]?.value ?? 2200;
    const engine = new PhysiologySimulationEngine({
      gLevel: 0.0,          // ISS microgravity
      cabinCO2_ppm: co2Reading,
      missionDay,
      ambientTemp_C: 22.5,
      exerciseLoad: 0.0,
      hydrationFactor: 1.0,
    });

    const physioState = engine.simulateToMissionDay(missionDay, sensors);
    return Physiology3DAdapter.mapToVisuals(physioState);
  } catch {
    // Fallback: return empty map — existing color logic handles rendering
    return {};
  }
}
type FocusRegion = "full" | "head" | "chest" | "abdomen" | "legs";

const FOCUS_TARGETS: Record<
  "male" | "female",
  Record<FocusRegion, { target: [number, number, number]; distance: number }>
> = {
  male: {
    full: { target: [0, 1.42, 0], distance: 5.1 },
    head: { target: [0, 2.68, 0], distance: 1.8 },
    chest: { target: [0, 2.12, 0], distance: 2.1 },
    abdomen: { target: [0, 1.75, 0], distance: 2.2 },
    legs: { target: [0, 0.82, 0], distance: 2.5 },
  },
  female: {
    full: { target: [0, 1.42, 0], distance: 5.1 },
    head: { target: [0, 2.67, 0], distance: 1.8 },
    chest: { target: [0, 2.08, 0], distance: 2.1 },
    abdomen: { target: [0, 1.70, 0], distance: 2.2 },
    legs: { target: [0, 0.78, 0], distance: 2.5 },
  },
};

/** Locally hosted CC BY reference anatomy. It never produces health data. */
export function BodyModel3D({
  readings,
  crewLabel,
  onOpenIndicator,
  missionDay = 1,
}: {
  readings: Record<string, Reading>;
  crewLabel: string;
  onOpenIndicator: (key: string) => void;
  /** Current mission day for the physiological simulation (default: 1) */
  missionDay?: number;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const labels = useRef<Partial<Record<BodyRegion, HTMLButtonElement | null>>>({});
  const control = useRef<{
    turn: (angle: number) => void;
    zoom: (factor: number) => void;
    reset: () => void;
    focusToRegion: (region: FocusRegion) => void;
    focusToPoint: (coords: [number, number, number], distance?: number) => void;
    refresh: () => void;
  } | null>(null);

  const [build, setBuild] = useState<"male" | "female">("male");
  const [system, setSystem] = useState<"all" | "blood" | "neuro" | "organs">("all");
  const [focusRegion, setFocusRegion] = useState<FocusRegion>("full");
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null);
  const heartBpm = scenarioHeartRate(readings.rest_hr);

  // Keep latest references for render callbacks
  const selectedOrganRef = useRef(selectedOrgan);
  selectedOrganRef.current = selectedOrgan;
  const hoveredOrganRef = useRef(hoveredOrgan);
  hoveredOrganRef.current = hoveredOrgan;
  const buildRef = useRef(build);
  buildRef.current = build;

  // ESC key listener to dismiss selected organ drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedOrgan) {
        setSelectedOrgan(null);
        setSelectedCentroid(undefined);
        control.current?.refresh();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedOrgan]);

  // Centroid coordinates of currently selected organ — set at click time, inside the WebGL handler
  const [selectedCentroid, setSelectedCentroid] = useState<[number, number, number] | undefined>(undefined);

  const systemRef = useRef(system);
  systemRef.current = system;

  const focusRegionRef = useRef(focusRegion);
  focusRegionRef.current = focusRegion;

  const readingsRef = useRef(readings);
  readingsRef.current = readings;

  const organMeshesRef = useRef<OrganMeshRecord[]>([]);

  // Physiological visual map derived from deterministic simulation engine.
  // Recomputes when readings or missionDay change. [SIMULADO] / [DATOS REALES] tagged per organ.
  const physioVisualMap = useMemo<OrganVisualizationMap>(
    () => buildPhysioVisualMap(readings, missionDay),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readings, missionDay]
  );
  const physioVisualMapRef = useRef(physioVisualMap);
  physioVisualMapRef.current = physioVisualMap;

  const regions = useMemo(() => {
    const byRegion = new Map<BodyRegion, { key: string; unusual: boolean; learning: boolean }>();
    for (const [key, reading] of Object.entries(readings)) {
      const region = RISK_REGION[reading.hrp_risk];
      if (!region) continue;
      const unusual = ["unusual_high", "unusual_low"].includes(reading.lens.personal);
      if (!byRegion.has(region) || unusual) {
        byRegion.set(region, { key, unusual, learning: reading.lens.personal === "learning" });
      }
    }
    return [...byRegion.entries()];

  }, [readings]);

  const regionRef = useRef(regions);
  regionRef.current = regions;

  // Single WebGL initialization effect (runs on mount, disposes on unmount)
  useEffect(() => {
    const host = mount.current;
    if (!host) return;

    let stopped = false;
    let cleanup = () => {};

    async function init() {
      try {
        const [T, { OrbitControls }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
        ]);
        if (stopped || !host) return;

        const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.className = "human-canvas";
        renderer.domElement.style.touchAction = "pan-y";
        host.prepend(renderer.domElement);

        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(0, 1.45, 5.1);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.42, 0);
        controls.enableZoom = true;
        controls.minDistance = 0.8;
        controls.maxDistance = 8.5;
        controls.enablePan = true;
        controls.panSpeed = 0.8;
        controls.screenSpacePanning = true;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        // Permit natural 3D tilt while avoiding flipping upside-down
        controls.minPolarAngle = Math.PI * 0.28;
        controls.maxPolarAngle = Math.PI * 0.72;
        controls.rotateSpeed = 0.65;
        // OrbitControls initially looks at the origin; aim it at the body before projecting labels.
        controls.update();

        scene.add(new T.HemisphereLight(0xffffff, 0x83919d, 2.7));
        const key = new T.DirectionalLight(0xfff8f2, 3.5);
        key.position.set(-3, 5, 5);
        scene.add(key);
        const rim = new T.DirectionalLight(0xadc8ff, 2);
        rim.position.set(3, 3, -2);
        scene.add(rim);
        const fill = new T.DirectionalLight(0xffffff, 0.8);
        fill.position.set(3, 1, 4);
        scene.add(fill);

        const material = new T.MeshStandardMaterial({ color: 0xcbd0da, roughness: 0.47, metalness: 0.12 });
        const shadow = new T.Mesh(
          new T.CircleGeometry(0.56, 64),
          new T.MeshBasicMaterial({ color: 0x172331, transparent: true, opacity: 0.07, depthWrite: false })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.scale.y = 0.5;
        shadow.position.y = -0.025;
        scene.add(shadow);

        const projected = new T.Vector3();
        const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

        const render = () => {
          if (stopped) return;

          const now = performance.now() / 1000; // seconds
          const physioMap = physioVisualMapRef.current;

          // Update organ colors, emissive and pulsation scale from physiological model + anomaly sentinel + selection
          for (const item of organMeshesRef.current) {
            const unusual = isOrganAnomalous(item.name, readingsRef.current);
            const surfaceMat = item.mesh.material as import("three").MeshStandardMaterial;

            // Check if this organ is actively selected by user click
            const isSelected = Boolean(
              selectedOrganRef.current &&
              (item.name.toLowerCase() === selectedOrganRef.current.toLowerCase() ||
               item.mesh.name.toLowerCase() === selectedOrganRef.current.toLowerCase() ||
               selectedOrganRef.current.toLowerCase().includes(item.name.toLowerCase()))
            );

            // Check if this organ is actively hovered by pointer
            const isHovered = Boolean(
              !isSelected &&
              hoveredOrganRef.current &&
              (item.name.toLowerCase() === hoveredOrganRef.current.toLowerCase() ||
               item.mesh.name.toLowerCase() === hoveredOrganRef.current.toLowerCase() ||
               hoveredOrganRef.current.toLowerCase().includes(item.name.toLowerCase()))
            );

            // Lookup physiological visual attributes for this organ (case-insensitive fuzzy key match)
            const organKey = item.name.toLowerCase();
            const physioEntry =
              physioMap[organKey] ??
              physioMap[organKey.replace(/\s+/g, "_")] ??
              Object.entries(physioMap).find(([k]) => organKey.includes(k) || k.includes(organKey))?.[1] ??
              null;

            if (isSelected) {
              // Highlight selected organ with cyan accent glow
              surfaceMat.color.setHex(0x38bdf8);
              surfaceMat.emissive.setHex(0x0284c7);
              surfaceMat.emissiveIntensity = 0.65;
              surfaceMat.roughness = 0.22;
            } else if (isHovered) {
              // Subtle hover highlight (light cyan sheen with blue emissive glow)
              surfaceMat.color.setHex(0x7dd3fc);
              surfaceMat.emissive.setHex(0x0369a1);
              surfaceMat.emissiveIntensity = 0.4;
              surfaceMat.roughness = 0.3;
            } else if (unusual) {
              // Existing anomaly sentinel has priority (personal baseline unusual reading)
              surfaceMat.color.setHex(0xe28b62);
              surfaceMat.emissive.setHex(0x8f3212);
              surfaceMat.emissiveIntensity = 0.28;
              surfaceMat.roughness = 0.35;
            } else if (physioEntry && physioEntry.classification !== "reference") {
              // Apply physiological simulation color [SIMULADO / DATOS REALES]
              surfaceMat.color.setHex(physioEntry.colorHex);
              surfaceMat.emissive.setHex(physioEntry.emissiveHex);
              surfaceMat.emissiveIntensity = physioEntry.emissiveIntensity;
              surfaceMat.roughness = physioEntry.classification === "mild_strain" ? 0.35 : 0.5;
            } else {
              // Default tissue palette
              surfaceMat.color.setHex(item.blood ? 0xc96a79 : item.neuro ? 0xb8a4d5 : 0xb5becb);
              surfaceMat.emissive.setHex(0x000000);
              surfaceMat.emissiveIntensity = 0.0;
              surfaceMat.roughness = 0.5;
            }

            // Only the heart mesh contracts; vessels and other structures stay anchored.
            if (item.name.trim().toLowerCase() === "heart") {
              item.mesh.scale.setScalar(heartScale(item.name, scenarioHeartRate(readingsRef.current.rest_hr), now, motionPreference.matches));
            }
          }

          renderer.render(scene, camera);

          // Position landmark pins using body-specific scaled anchors
          const facingFront = Math.cos(controls.getAzimuthalAngle()) > 0.12;
          const currentAnchors = ANCHORS_BY_BUILD[buildRef.current] ?? ANCHORS_BY_BUILD.male;

          for (const [region] of regionRef.current) {
            const label = labels.current[region];
            if (!label) continue;
            const coords = currentAnchors[region] ?? [0, 1.42, 0];
            projected.set(...coords).project(camera);
            label.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
            label.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
            label.hidden = !facingFront;
          }
        };

        // Smooth camera transition animation helper
        let animating = false;
        const animTarget = new T.Vector3();
        const animCamPos = new T.Vector3();

        const smoothFocus = (targetCoords: [number, number, number], distance: number) => {
          animTarget.set(...targetCoords);
          const currentOffset = camera.position.clone().sub(controls.target);
          if (currentOffset.lengthSq() < 0.001) currentOffset.set(0, 0, 1);
          const dir = currentOffset.normalize();
          animCamPos.copy(animTarget).add(dir.multiplyScalar(distance));
          if (motionPreference.matches) {
            animating = false;
            controls.target.copy(animTarget);
            camera.position.copy(animCamPos);
            controls.update();
            render();
            return;
          }
          animating = true;

          const step = () => {
            if (!animating || stopped) return;
            controls.target.lerp(animTarget, 0.12);
            camera.position.lerp(animCamPos, 0.12);
            controls.update();
            render();

            if (
              controls.target.distanceTo(animTarget) < 0.005 &&
              camera.position.distanceTo(animCamPos) < 0.005
            ) {
              controls.target.copy(animTarget);
              camera.position.copy(animCamPos);
              controls.update();
              render();
              animating = false;
            } else {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        };

        const onControlsChange = () => {
          render();
        };
        controls.addEventListener("change", onControlsChange);
        motionPreference.addEventListener("change", render);

        // Lightweight pulsation animation loop (~30fps).
        // Runs only when at least one organ has an active pulsation frequency.
        // Paused when stopped; resumes on each RAF tick.
        let lastPulse = 0;
        const PULSE_INTERVAL_MS = 33; // ~30 fps
        const pulsationLoop = (ts: number) => {
          if (stopped) return;
          requestAnimationFrame(pulsationLoop);
          // Check if any organ has non-zero pulsation
          const hasPulsation = !motionPreference.matches && !document.hidden && scenarioHeartRate(readingsRef.current.rest_hr) !== null;
          if (!hasPulsation) return;
          if (ts - lastPulse >= PULSE_INTERVAL_MS) {
            lastPulse = ts;
            render();
          }
        };
        requestAnimationFrame(pulsationLoop);

        const onControlsStart = () => {
          animating = false;
        };
        controls.addEventListener("start", onControlsStart);

        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          if (!width || !height || stopped) return;
          camera.aspect = width / height;
          camera.position.setLength(Math.max(5.3, 3.25 / Math.max(0.55, camera.aspect)));
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
          render();
        };

        const observer = new ResizeObserver(resize);
        observer.observe(host);

        const theme = () => {
          material.color.set(document.documentElement.dataset.theme === "dark" ? 0xb8c7db : 0xc5cbd5);
          render();
        };
        const themeObserver = new MutationObserver(theme);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

        control.current = {
          turn: (angle) => {
            const offset = camera.position.clone().sub(controls.target);
            offset.applyAxisAngle(new T.Vector3(0, 1, 0), angle);
            camera.position.copy(controls.target).add(offset);
            controls.update();
            render();
          },
          zoom: (factor) => {
            const offset = camera.position.clone().sub(controls.target);
            offset.setLength(Math.min(8.5, Math.max(0.8, offset.length() * factor)));
            camera.position.copy(controls.target).add(offset);
            controls.update();
            render();
          },
          reset: () => {
            setFocusRegion("full");
            smoothFocus([0, 1.42, 0], 5.1);
          },
          focusToRegion: (r: FocusRegion) => {
            const cfg = FOCUS_TARGETS[buildRef.current][r];
            if (cfg) {
              smoothFocus(cfg.target, cfg.distance);
            }
          },
          focusToPoint: (coords, distance = 1.8) => {
            smoothFocus(coords, distance);
          },
          refresh: render,
        };

        // Fetch anatomy assets once
        const { description, bytes } = await loadAnatomyAssets(import.meta.env.BASE_URL);
        if (stopped) return;

        function createGeometry(data: SurfaceDef) {
          const geometry = new T.BufferGeometry();
          geometry.setAttribute(
            "position",
            new T.Float32BufferAttribute(new Float32Array(bytes, data.pos, data.verts * 3), 3)
          );
          geometry.setIndex(new T.BufferAttribute(new Uint32Array(bytes, data.idx, data.tris * 3), 1));
          if (data.nrm !== undefined) {
            geometry.setAttribute(
              "normal",
              new T.Float32BufferAttribute(new Float32Array(bytes, data.nrm, data.verts * 3), 3)
            );
          } else {
            geometry.computeVertexNormals();
          }
          return geometry;
        }

        /**
         * Creates an organ geometry centered around its anatomical centroid.
         * The mesh position will be set to this centroid, so scaling or rotation
         * occurs strictly around the organ's own center and never shifts out of the body.
         */
        function createOrganGeometry(data: SurfaceDef) {
          const geometry = createGeometry(data);
          const center = new T.Vector3();
          if (data.center) {
            center.set(data.center[0], data.center[1], data.center[2]);
            geometry.translate(-data.center[0], -data.center[1], -data.center[2]);
          } else {
            geometry.computeBoundingBox();
            if (geometry.boundingBox) {
              geometry.boundingBox.getCenter(center);
              geometry.translate(-center.x, -center.y, -center.z);
            }
          }
          return { geometry, center };
        }

        // Build models for both male and female so switching is instant without re-fetching
        const bodyGroups: Record<string, Group> = {};
        const bodyOrgans: Record<string, OrganMeshRecord[]> = {};

        for (const [keyName, reference] of Object.entries(description.bodies)) {
          const group = new T.Group();
          group.name = `body_${keyName}`;

          const skin = new T.Mesh(
            createGeometry(reference.skin),
            new T.MeshPhysicalMaterial({
              color: 0xa4cce2,
              transparent: true,
              opacity: 0.16,
              roughness: 0.25,
              metalness: 0.08,
              depthWrite: false,
              side: T.DoubleSide,
            })
          );
          skin.renderOrder = 2;
          skin.name = "skin";
          group.add(skin);

          const organList: OrganMeshRecord[] = [];
          for (const organ of reference.organs) {
            const blood = /heart|aorta|vessel|jugular/.test(organ.name);
            const neuro = /brain|eye|spinal|vertebral/.test(organ.name);

            const { geometry, center } = createOrganGeometry(organ);
            const mesh = new T.Mesh(
              geometry,
              new T.MeshStandardMaterial({
                color: blood ? 0xc96a79 : neuro ? 0xb8a4d5 : 0xb5becb,
                roughness: 0.5,
                metalness: 0.08,
                emissive: 0x000000,
                emissiveIntensity: 0.0,
              })
            );
            mesh.position.copy(center);
            mesh.name = organ.name;
            group.add(mesh);
            organList.push({ name: organ.name, mesh, blood, neuro });
          }

          // If female build, load female-exclusive uterus reference anatomy
          if (keyName === "female") {
            try {
              const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
              const gltfLoader = new GLTFLoader();
              const uterusGltf = await gltfLoader.loadAsync(`${import.meta.env.BASE_URL}assets/anatomy/uterus.glb`);
              if (!stopped && uterusGltf?.scene) {
                const uterusGroup = uterusGltf.scene;
                uterusGroup.name = "uterus";
                // Pelvic cavity position in Visible Human female
                uterusGroup.position.set(-0.01, 0.82, 0.02);
                uterusGroup.traverse((child) => {
                  if ((child as Mesh).isMesh) {
                    const m = child as Mesh;
                    m.name = "uterus";
                    m.material = new T.MeshStandardMaterial({
                      color: 0xb5becb,
                      roughness: 0.5,
                      metalness: 0.08,
                      emissive: 0x000000,
                      emissiveIntensity: 0.0,
                    });
                    organList.push({ name: "uterus", mesh: m, blood: false, neuro: false });
                  }
                });
                group.add(uterusGroup);
              }
            } catch (err) {
              console.warn("Uterus GLB reference not loaded:", err);
            }
          }

          group.scale.setScalar(2.8 / reference.height);
          group.visible = false;
          scene.add(group);

          bodyGroups[keyName] = group;
          bodyOrgans[keyName] = organList;
        }

        // Raycasting for organ selection, hover feedback and double-click focus
        const raycaster = new T.Raycaster();
        const mouse = new T.Vector2();

        let pointerDownX = 0;
        let pointerDownY = 0;
        let pointerDownTime = 0;

        const onPointerDown = (event: PointerEvent) => {
          pointerDownX = event.clientX;
          pointerDownY = event.clientY;
          pointerDownTime = performance.now();
        };

        const onPointerMove = (event: PointerEvent) => {
          // If camera is actively animating/rotating, skip hover checks
          if (animating) return;

          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);

          const currentOrgans = bodyOrgans[buildRef.current] ?? [];
          const visibleMeshes = currentOrgans
            .map((o) => o.mesh)
            .filter((m) => m.visible && m.name !== "skin");
          const intersects = raycaster.intersectObjects(visibleMeshes, false);

          if (intersects.length > 0 && intersects[0]?.object) {
            const hitMesh = intersects[0].object as Mesh;
            const hitName = hitMesh.name || "organ";
            if (hoveredOrganRef.current !== hitName) {
              hoveredOrganRef.current = hitName;
              setHoveredOrgan(hitName);
              renderer.domElement.style.cursor = "pointer";
              render();
            }
          } else {
            if (hoveredOrganRef.current !== null) {
              hoveredOrganRef.current = null;
              setHoveredOrgan(null);
              renderer.domElement.style.cursor = "grab";
              render();
            }
          }
        };

        const onPointerLeave = () => {
          if (hoveredOrganRef.current !== null) {
            hoveredOrganRef.current = null;
            setHoveredOrgan(null);
            renderer.domElement.style.cursor = "grab";
            render();
          }
        };

        const onPointerUp = (event: PointerEvent) => {
          if (event.button !== 0) return; // Only primary button
          const dx = event.clientX - pointerDownX;
          const dy = event.clientY - pointerDownY;
          const dt = performance.now() - pointerDownTime;

          // Distinguish clean click from camera orbit drag / pan
          if (dx * dx + dy * dy > 36 || dt > 350) return;

          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);

          const currentOrgans = bodyOrgans[buildRef.current] ?? [];
          const visibleMeshes = currentOrgans.map((o) => o.mesh).filter((m) => m.visible);
          const intersects = raycaster.intersectObjects(visibleMeshes, false);

          if (intersects.length > 0 && intersects[0]?.object) {
            const hitMesh = intersects[0].object as Mesh;
            const hitName = hitMesh.name || "organ";
            setSelectedOrgan(hitName);
            // Capture the centroid of the clicked mesh immediately while in WebGL scope
            const p = hitMesh.position;
            setSelectedCentroid([p.x, p.y, p.z]);
          } else {
            // Clicked background or skin -> clear selection
            setSelectedOrgan(null);
            setSelectedCentroid(undefined);
          }
          render();
        };

        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        renderer.domElement.addEventListener("pointermove", onPointerMove);
        renderer.domElement.addEventListener("pointerleave", onPointerLeave);

        const onDblClick = (event: MouseEvent) => {
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);

          const activeGroup = bodyGroups[buildRef.current];
          if (!activeGroup) return;

          const intersects = raycaster.intersectObjects(activeGroup.children, true);
          const hit =
            intersects.find((i) => i.object.visible && (i.object as Mesh).name !== "skin") ||
            intersects.find((i) => i.object.visible);

          if (hit && hit.point) {
            smoothFocus([hit.point.x, hit.point.y, hit.point.z], 1.8);
          }
        };
        renderer.domElement.addEventListener("dblclick", onDblClick);

        cleanup = () => {
          observer.disconnect();
          themeObserver.disconnect();
          motionPreference.removeEventListener("change", render);
          controls.removeEventListener("change", onControlsChange);
          controls.removeEventListener("start", onControlsStart);
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
          renderer.domElement.removeEventListener("dblclick", onDblClick);
          controls.dispose();
          disposeObject(scene);
          material.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          control.current = null;
        };

        // Helper to update current body and filter visibility
        const updateSceneDisplay = () => {
          const currentBuild = buildRef.current;
          const currentSystem = systemRef.current;

          // If currently selected organ does not exist in new body reference, clear selection
          if (selectedOrganRef.current) {
            const activeOrgans = bodyOrgans[currentBuild] ?? [];
            const exists = activeOrgans.some(
              (o) => o.name.toLowerCase() === selectedOrganRef.current?.toLowerCase()
            );
            if (!exists) {
              setSelectedOrgan(null);
            }
          }

          for (const [keyName, group] of Object.entries(bodyGroups)) {
            const isCurrent = keyName === currentBuild;
            group.visible = isCurrent;

            if (isCurrent) {
              const organs = bodyOrgans[keyName] ?? [];
              organMeshesRef.current = organs;
              for (const item of organs) {
                const isVisible =
                  currentSystem === "all"
                    ? true
                    : currentSystem === "blood"
                      ? item.blood
                      : currentSystem === "neuro"
                        ? item.neuro
                        : !item.blood && !item.neuro;
                item.mesh.visible = isVisible;
              }
            }
          }

          render();
        };

        // Attach updater to control object so outer React effects can trigger it
        if (control.current) {
          control.current.refresh = () => {
            updateSceneDisplay();
          };
        }

        updateSceneDisplay();
        resize();
        theme();
        setStatus("ready");
      } catch (error) {
        if (!stopped && !(error instanceof DOMException && error.name === "AbortError")) {
          cleanup();
          setStatus("unavailable");
        }
      }
    }

    void init();

    return () => {
      stopped = true;
      cleanup();
    };
  }, []);

  // Update visible system / build without destroying the WebGL context
  useEffect(() => {
    if (status === "ready") {
      control.current?.refresh();
      // If a region was selected, re-align to that body's coordinates
      if (focusRegion !== "full") {
        control.current?.focusToRegion(focusRegion);
      }
    }
  }, [build, system, status]);

  // Update anomaly highlights when readings change
  useEffect(() => {
    if (status === "ready") {
      control.current?.refresh();
    }
  }, [readings, status]);

  return (
    <figure
      className="human-viewer"
      aria-label={`Interactive 3D body view for ${crewLabel}`}
      data-model-status={status}
      data-heart-bpm={heartBpm ?? "unavailable"}
    >
      <div className="anatomy-tools">
        <label>
          Reference body{" "}
          <select
            value={build}
            onChange={(e) => setBuild(e.target.value as "male" | "female")}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label>
          Body systems{" "}
          <select
            value={system}
            onChange={(e) =>
              setSystem(e.target.value as "all" | "blood" | "neuro" | "organs")
            }
          >
            <option value="all">All systems</option>
            <option value="blood">Heart and blood</option>
            <option value="neuro">Brain, eyes and spine</option>
            <option value="organs">Organs</option>
          </select>
        </label>
        <label>
          Focus area{" "}
          <select
            value={focusRegion}
            onChange={(e) => {
              const r = e.target.value as FocusRegion;
              setFocusRegion(r);
              control.current?.focusToRegion(r);
            }}
          >
            <option value="full">Whole body</option>
            <option value="head">Head (Brain & Eyes)</option>
            <option value="chest">Chest (Heart & Lungs)</option>
            <option value="abdomen">Abdomen & Viscera</option>
            <option value="legs">Lower body & Legs</option>
          </select>
        </label>
      </div>

      <div className="human-stage" ref={mount}>
        {status === "loading" ? (
          <p className="human-loading" role="status">
            Loading body view…
          </p>
        ) : null}
        {status === "unavailable" ? (
          <p className="human-loading" role="status">
            3D view unavailable on this device. All readings remain available in the signal list.
          </p>
        ) : null}
        {status === "ready"
          ? regions.map(([region, info]) => (
              <button
                type="button"
                key={region}
                ref={(element) => {
                  labels.current[region] = element;
                }}
                className={`human-landmark ${info.unusual ? "is-unusual" : info.learning ? "is-learning" : ""}`}
                onClick={() => onOpenIndicator(info.key)}
                aria-label={`${REGION_LABEL[region]}: ${
                  info.unusual ? "unusual for you" : info.learning ? "learning baseline" : "typical for you"
                }. Open ${indicatorMeta(info.key).label}`}
              >
                <span className="human-landmark__dot" />
                <span className="human-landmark__name">{indicatorMeta(info.key).short}</span>
              </button>
            ))
          : null}
      </div>

      <p className="heart-motion-note">{heartBpm !== null
        ? `Heart motion follows the selected synthetic resting heart rate: ${heartBpm} bpm (${(heartBpm / 60).toFixed(2)} beats per second).`
        : "Heart motion is paused because this synthetic scenario has no valid heart-rate reading."}</p>

      {/* Selected organ detailed physiological & mathematical statistics drawer */}
      {selectedOrgan ? (
        <ErrorBoundary
          fallbackTitle="Panel de órgano no disponible"
          onReset={() => {
            setSelectedOrgan(null);
            setSelectedCentroid(undefined);
            control.current?.refresh();
          }}
        >
          <OrganStatsPanel
            organName={selectedOrgan}
            visualAttrs={
              physioVisualMap[selectedOrgan.toLowerCase()] ??
              physioVisualMap[selectedOrgan.toLowerCase().replace(/\s+/g, "_")] ??
              Object.entries(physioVisualMap).find(([k]) =>
                selectedOrgan.toLowerCase().includes(k) || k.includes(selectedOrgan.toLowerCase())
              )?.[1]
            }
            build={build}
            missionDay={missionDay}
            readings={readings}
            position={selectedCentroid}
            fallbackGeometry={
              organMeshesRef.current.find(
                (o) =>
                  o.name.toLowerCase() === selectedOrgan.toLowerCase() ||
                  selectedOrgan.toLowerCase().includes(o.name.toLowerCase()) ||
                  o.name.toLowerCase().includes(selectedOrgan.toLowerCase())
              )?.mesh.geometry
            }
            onClose={() => {
              setSelectedOrgan(null);
              setSelectedCentroid(undefined);
              control.current?.refresh();
            }}
            onFocusOrgan={(name) => {
              const item = organMeshesRef.current.find(
                (o) => o.name.toLowerCase() === name.toLowerCase() ||
                       name.toLowerCase().includes(o.name.toLowerCase())
              );
              if (item) {
                const p = item.mesh.position;
                control.current?.focusToPoint([p.x, p.y, p.z], 1.6);
              }
            }}
            onSelectOrgan={(name) => {
              const item = organMeshesRef.current.find(
                (o) => o.name.toLowerCase() === name.toLowerCase() ||
                       name.toLowerCase().includes(o.name.toLowerCase())
              );
              setSelectedOrgan(name);
              if (item) {
                const p = item.mesh.position;
                setSelectedCentroid([p.x, p.y, p.z]);
              } else {
                setSelectedCentroid(undefined);
              }
              control.current?.refresh();
            }}
            onOpenIndicator={onOpenIndicator}
          />
        </ErrorBoundary>
      ) : null}

      {/* Physiology simulation panel — deterministic model, not diagnosis (shows when region focused and no single organ selected) */}
      {!selectedOrgan && status === "ready" && focusRegion !== "full" && (() => {
        // Map focused region to relevant physio entry keys
        const regionToPhysioKeys: Record<FocusRegion, string[]> = {
          full: [],
          head: ["brain", "left eyeball"],
          chest: ["heart", "lung"],
          abdomen: ["liver", "kidney_left"],
          legs: ["vertebral column"],
        };
        const keys = regionToPhysioKeys[focusRegion] ?? [];
        const entries = keys
          .map((k) => [k, physioVisualMap[k]] as [string, typeof physioVisualMap[string]])
          .filter(([, v]) => v != null);
        if (entries.length === 0) return null;

        return (
          <div className="physio-panel" aria-label="Physiological simulation data for focused region">
            <p className="physio-panel__header">
              Physiological simulation · Click any organ in 3D to inspect mathematical ODE details
            </p>
            {entries.map(([key, entry]) => (
              <details key={key} className="physio-panel__organ">
                <summary className="physio-panel__organ-name">
                  {key.replace(/_/g, " ")}
                  {entry.classification === "mild_strain" ? (
                    <span className="physio-panel__strain"> ⚠ mild strain</span>
                  ) : null}
                </summary>
                <p className="physio-panel__desc">{entry.statusDescription}</p>
                <ul className="physio-panel__metrics">
                  {Object.entries(entry.telemetry).map(([tk, tv]) => (
                    <li key={tk}>
                      <span className="physio-panel__metric-label">{tv.label}</span>{" "}
                      <strong>{tv.value.toFixed(1)}</strong> {tv.unit}{" "}
                      <span className="physio-panel__tag">{tv.tag}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            <p className="physio-panel__disclaimer">
              Illustrative reference anatomy · not a crew scan · not a medical device.
            </p>
          </div>
        );
      })()}

      <figcaption>
        <div className="human-controls" role="group" aria-label="Rotate 3D model">
          <button
            type="button"
            disabled={status !== "ready"}
            onClick={() => control.current?.turn(-Math.PI / 6)}
            aria-label="Rotate model left"
          >
            <Icon name="chevron" size={16} className="rotate-left" />
          </button>
          <button type="button" disabled={status !== "ready"} onClick={() => control.current?.reset()}>
            Front view
          </button>
          <button
            type="button"
            disabled={status !== "ready"}
            onClick={() => control.current?.turn(Math.PI / 6)}
            aria-label="Rotate model right"
          >
            <Icon name="chevron" size={16} className="rotate-right" />
          </button>
          <button
            type="button"
            disabled={status !== "ready"}
            onClick={() => control.current?.zoom(0.8)}
            aria-label="Zoom anatomy in"
          >
            +
          </button>
          <button
            type="button"
            disabled={status !== "ready"}
            onClick={() => control.current?.zoom(1.25)}
            aria-label="Zoom anatomy out"
          >
            −
          </button>
        </div>
        <p className="human-caption">
          Drag to rotate · Right-click or 2-finger drag to pan · Click any organ to inspect mathematical model · Double-click to focus point.
          <br />
          Landmarks link to your signals · Illustrative reference anatomy.
        </p>
        <p className="human-caption">
          {build === "male"
            ? "BodyParts3D © The Database Center for Life Science"
            : "HuBMAP Consortium · HRA Visible Human female"}{" "}
          ·{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
        </p>
      </figcaption>
    </figure>
  );
}

