import { useEffect, useMemo, useRef, useState } from "react";
import type { Mesh, Material, Object3D, SkinnedMesh } from "three";
import { indicatorMeta, REGION_LABEL, RISK_REGION, type BodyRegion } from "../lib/meta";
import type { Reading } from "../lib/types";
import { Icon } from "./Icon";

const ANCHORS: Record<BodyRegion, [number, number, number]> = {
  head: [0.1, 2.57, .15], eyes: [-.1, 2.65, .18], chest: [.15, 2.12, .2],
  abdomen: [-.15, 1.65, .18], legs: [.12, .8, .11],
};

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

/** Locally hosted CC BY reference anatomy. It never produces health data. */
export function BodyModel3D({ readings, crewLabel, onOpenIndicator }: {
  readings: Record<string, Reading>;
  crewLabel: string;
  onOpenIndicator: (key: string) => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const labels = useRef<Partial<Record<BodyRegion, HTMLButtonElement | null>>>({});
  const control = useRef<{ turn: (angle: number) => void; zoom: (factor: number) => void; reset: () => void; refresh: () => void } | null>(null);
  const [build, setBuild] = useState("male");
  const [system, setSystem] = useState("all");
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const regions = useMemo(() => {
    const byRegion = new Map<BodyRegion, { key: string; unusual: boolean; learning: boolean }>();
    for (const [key, reading] of Object.entries(readings)) {
      const region = RISK_REGION[reading.hrp_risk];
      if (!region) continue;
      const unusual = ["unusual_high", "unusual_low"].includes(reading.lens.personal);
      if (!byRegion.has(region) || unusual) byRegion.set(region, { key, unusual, learning: reading.lens.personal === "learning" });
    }
    return [...byRegion.entries()];
  }, [readings]);
  const regionRef = useRef(regions);
  regionRef.current = regions;

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let stopped = false;
    let cleanup = () => {};
    const abort = new AbortController();
    async function start() {
      try {
        const [T, { OrbitControls }] = await Promise.all([
          import("three"), import("three/examples/jsm/controls/OrbitControls.js"),
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
        const camera = new T.PerspectiveCamera(35, 1, .1, 100);
        camera.position.set(0, 1.45, 5.1);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.42, 0);
        controls.enableZoom = true;
        controls.minDistance = 2; controls.maxDistance = 8;
        controls.enablePan = false;
        controls.enableDamping = false;
        controls.minPolarAngle = Math.PI / 2;
        controls.maxPolarAngle = Math.PI / 2;
        controls.rotateSpeed = .65;
        renderer.domElement.style.touchAction = "pan-y";
        scene.add(new T.HemisphereLight(0xffffff, 0x83919d, 2.7));
        const key = new T.DirectionalLight(0xfff8f2, 3.5); key.position.set(-3, 5, 5); scene.add(key);
        const rim = new T.DirectionalLight(0xadc8ff, 2); rim.position.set(3, 3, -2); scene.add(rim);
        const fill = new T.DirectionalLight(0xffffff, .8); fill.position.set(3, 1, 4); scene.add(fill);
        const material = new T.MeshStandardMaterial({ color: 0xcbd0da, roughness: .47, metalness: .12 });
        const shadow = new T.Mesh(new T.CircleGeometry(.56, 64), new T.MeshBasicMaterial({ color: 0x172331, transparent: true, opacity: .07, depthWrite: false }));
        shadow.rotation.x = -Math.PI / 2; shadow.scale.y = .5; shadow.position.y = -.025; scene.add(shadow);
        const projected = new T.Vector3();
        const organMeshes: {mesh: Mesh; blood: boolean; neuro: boolean}[] = [];
        const render = () => {
          if (stopped) return;
          for (const {mesh,blood,neuro} of organMeshes) {
            const unusual = regionRef.current.some(([r,v])=>v.unusual&&(r==="chest"&&blood||r==="head"&&neuro||r==="abdomen"&&!blood&&!neuro));
            const surfaceMaterial = mesh.material as import("three").MeshStandardMaterial;
            surfaceMaterial.color.setHex(unusual?0xe28b62:blood?0xc96a79:neuro?0xb8a4d5:0xb5becb);
            surfaceMaterial.emissive.setHex(unusual?0x8f3212:0x000000);
          }
          renderer.render(scene, camera);
          const facingFront = Math.cos(controls.getAzimuthalAngle()) > .15;
          for (const [region] of regionRef.current) {
            const label = labels.current[region];
            if (!label) continue;
            projected.set(...ANCHORS[region]).project(camera);
            label.style.left = `${(projected.x * .5 + .5) * 100}%`;
            label.style.top = `${(-projected.y * .5 + .5) * 100}%`;
            label.hidden = !facingFront;
          }
        };
        const resize = () => {
          const width = host.clientWidth, height = host.clientHeight;
          if (!width || !height || stopped) return;
          camera.aspect = width / height;
          // Preserve the whole body when the viewer becomes narrow.
          camera.position.setLength(Math.max(5.3, 3.25 / Math.max(.55, camera.aspect)));
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
          render();
        };
        const observer = new ResizeObserver(resize); observer.observe(host);
        controls.addEventListener("change", render);
        const theme = () => {
          material.color.set(document.documentElement.dataset.theme === "dark" ? 0xb8c7db : 0xc5cbd5);
          render();
        };
        const themeObserver = new MutationObserver(theme);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        control.current = {
          turn: (angle) => { const offset = camera.position.clone().sub(controls.target); offset.applyAxisAngle(new T.Vector3(0, 1, 0), angle); camera.position.copy(controls.target).add(offset); controls.update(); render(); },
          zoom: (factor) => { const offset=camera.position.clone().sub(controls.target); offset.setLength(Math.min(8,Math.max(2,offset.length()*factor))); camera.position.copy(controls.target).add(offset); controls.update(); render(); },
          reset: () => { camera.position.set(0, 1.42, 5.1); controls.update(); resize(); },
          refresh: render,
        };
        cleanup = () => {
          observer.disconnect(); themeObserver.disconnect(); controls.dispose();
          disposeObject(scene); material.dispose(); renderer.dispose(); renderer.domElement.remove();
          control.current = null;
        };
        const base = `${import.meta.env.BASE_URL}assets/anatomy/`;
        const [description, bytes] = await Promise.all([
          fetch(base + "anatomy.json", {signal:abort.signal}).then(r=>{if(!r.ok)throw Error("Missing anatomy");return r.json();}),
          fetch(base + "anatomy.bin", {signal:abort.signal}).then(r=>{if(!r.ok)throw Error("Missing anatomy");return r.arrayBuffer();}),
        ]);
        if (stopped) return;
        type Surface = {name:string;pos:number;verts:number;idx:number;tris:number;nrm?:number};
        const reference = description.bodies[build];
        const model = new T.Group();
        function surface(data:Surface) {
          const geometry = new T.BufferGeometry();
          geometry.setAttribute("position",new T.Float32BufferAttribute(new Float32Array(bytes,data.pos,data.verts*3),3));
          geometry.setIndex(new T.BufferAttribute(new Uint32Array(bytes,data.idx,data.tris*3),1));
          if(data.nrm!==undefined) geometry.setAttribute("normal",new T.Float32BufferAttribute(new Float32Array(bytes,data.nrm,data.verts*3),3));
          else geometry.computeVertexNormals();
          return geometry;
        }
        const skin = new T.Mesh(surface(reference.skin),new T.MeshPhysicalMaterial({color:0xa4cce2,transparent:true,opacity:.16,roughness:.25,metalness:.08,depthWrite:false,side:T.DoubleSide}));
        skin.renderOrder=2;model.add(skin);
        for(const organ of reference.organs as Surface[]) {
          const blood=/heart|aorta|vessel|jugular/.test(organ.name);
          const neuro=/brain|eye|spinal|vertebral/.test(organ.name);
          if(system==="blood"&&!blood || system==="neuro"&&!neuro || system==="organs"&&(blood||neuro)) continue;
          const unusual = regionRef.current.some(([r,v])=>v.unusual&&(r==="chest"&&blood||r==="head"&&neuro||r==="abdomen"&&!blood&&!neuro));
          const mesh = new T.Mesh(surface(organ),new T.MeshStandardMaterial({color:unusual?0xe28b62:blood?0xc96a79:neuro?0xb8a4d5:0xb5becb,roughness:.5,metalness:.08,emissive:unusual?0x8f3212:0x000000,emissiveIntensity:.18}));
          organMeshes.push({mesh,blood,neuro});
          model.add(mesh);
        }
        model.scale.setScalar(2.8/reference.height);
        scene.add(model); controls.update(); theme(); resize();
        setStatus("ready");
      } catch (error) {
        if (!stopped && !(error instanceof DOMException && error.name === "AbortError")) {
          cleanup(); setStatus("unavailable");
        }
      }
    }
    void start();
    return () => { stopped = true; abort.abort(); cleanup(); };
  }, [build, system]);

  useEffect(() => { control.current?.refresh(); }, [regions, status]);

  return <figure className="human-viewer" aria-label={`Interactive 3D body view for ${crewLabel}`} data-model-status={status}>
    <div className="anatomy-tools"><label>Reference body <select value={build} onChange={e=>{setStatus("loading");setBuild(e.target.value);}}><option value="male">Male</option><option value="female">Female</option></select></label><label>Body systems <select value={system} onChange={e=>{setStatus("loading");setSystem(e.target.value);}}><option value="all">All systems</option><option value="blood">Heart and blood</option><option value="neuro">Brain, eyes and spine</option><option value="organs">Organs</option></select></label></div>
    <div className="human-stage" ref={mount}>
      {status === "loading" ? <p className="human-loading" role="status">Loading body view…</p> : null}
      {status === "unavailable" ? <p className="human-loading" role="status">3D view unavailable on this device. All readings remain available in the signal list.</p> : null}
      {status === "ready" ? regions.map(([region, info]) => <button
        type="button" key={region} ref={(element) => { labels.current[region] = element; }}
        className={`human-landmark ${info.unusual ? "is-unusual" : info.learning ? "is-learning" : ""}`}
        onClick={() => onOpenIndicator(info.key)}
        aria-label={`${REGION_LABEL[region]}: ${info.unusual ? "unusual for you" : info.learning ? "learning baseline" : "typical for you"}. Open ${indicatorMeta(info.key).label}`}
      ><span className="human-landmark__dot" /><span className="human-landmark__name">{indicatorMeta(info.key).short}</span></button>) : null}
    </div>
    <figcaption>
      <div className="human-controls" role="group" aria-label="Rotate 3D model">
        <button type="button" disabled={status !== "ready"} onClick={() => control.current?.turn(-Math.PI / 6)} aria-label="Rotate model left"><Icon name="chevron" size={16} className="rotate-left" /></button>
        <button type="button" disabled={status !== "ready"} onClick={() => control.current?.reset()}>Front view</button>
        <button type="button" disabled={status !== "ready"} onClick={() => control.current?.turn(Math.PI / 6)} aria-label="Rotate model right"><Icon name="chevron" size={16} className="rotate-right" /></button>
        <button type="button" disabled={status !== "ready"} onClick={() => control.current?.zoom(.8)} aria-label="Zoom anatomy in">+</button>
        <button type="button" disabled={status !== "ready"} onClick={() => control.current?.zoom(1.25)} aria-label="Zoom anatomy out">−</button>
      </div>
      <p className="human-caption">Drag to rotate. Landmarks link to your signals.<br />Illustrative reference anatomy · not a crew scan.</p>
      <p className="human-caption">{build === "male" ? "BodyParts3D © The Database Center for Life Science" : "HuBMAP Consortium · HRA Visible Human female"} · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></p>
    </figcaption>
  </figure>;
}
