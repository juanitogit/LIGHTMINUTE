import { useMemo, useState } from "react";
import type { LoadedScenario } from "../lib/types";
import { Icon } from "../components/Icon";
import { Chip } from "../components/primitives";
import "../moon-environment.css";

interface MoonEnvironmentProps {
  scenario?: LoadedScenario | null;
  dayNumber?: number;
  crewId?: string;
  embedded?: boolean;
  onOpenTablet?: () => void;
  onOpenHud?: () => void;
}

// Seeded deterministic pseudo-random generator (mulberry32)
function createSeededRand(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function MoonEnvironmentView(props: MoonEnvironmentProps) {
  const { scenario, dayNumber = 1, embedded = false, onOpenTablet, onOpenHud } = props;
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Compute environmental telemetry from current scenario
  const sepEvent = Boolean(scenario?.doc?.scenario?.toLowerCase().includes("sep") ?? scenario?.doc?.name?.toLowerCase().includes("sep"));
  const radFlux = sepEvent ? 124.5 : 4.2; // pfu

  // Deterministic generation of stars once
  const { dimStars, brightStars } = useMemo(() => {
    const rand = createSeededRand(42);
    const starColors = ["#ffffff", "#eef4ff", "#fff8e8", "#e8f0ff", "#fff0e0"];

    // 280 subtle stars
    const dims: Array<{
      cx: number;
      cy: number;
      r: number;
      fill: string;
      opacity: number;
      anim?: { dur: string; min: number; begin: string };
    }> = [];

    for (let i = 0; i < 280; i++) {
      const x = Math.floor(rand() * 1920);
      const y = Math.floor(rand() * 490);
      const r = +(0.5 + rand() * 1.3).toFixed(2);
      const c = starColors[Math.floor(rand() * starColors.length)] ?? "#ffffff";
      const op = +(0.2 + rand() * 0.7).toFixed(2);

      let anim = undefined;
      if (rand() < 0.45) {
        anim = {
          dur: (4 + rand() * 4).toFixed(1) + "s",
          min: +(op * 0.45).toFixed(2),
          begin: (rand() * 8).toFixed(1) + "s",
        };
      }
      dims.push({ cx: x, cy: y, r, fill: c, opacity: op, anim });
    }

    // Navigational bright stars with diffraction spikes
    const brightPositions = [
      [120, 95, 2.8, "#fffde8", 0.95],
      [445, 65, 2.2, "#e8f0ff", 0.9],
      [780, 130, 2.5, "#fff8e0", 0.88],
      [1050, 55, 2.0, "#e8f0ff", 0.92],
      [1550, 110, 2.6, "#fffde8", 0.9],
      [1850, 180, 1.8, "#e8f0ff", 0.85],
      [290, 240, 2.1, "#fff0e8", 0.82],
      [1680, 320, 2.3, "#e8f0ff", 0.88],
      [620, 190, 1.9, "#fffde8", 0.8],
      [1200, 160, 2.4, "#e8f8ff", 0.87],
      [950, 85, 2.0, "#fff8f0", 0.85],
      [1750, 70, 2.5, "#e8f0ff", 0.9],
      [60, 350, 1.8, "#fffde8", 0.8],
      [1900, 420, 1.7, "#e8f0ff", 0.78],
    ] as const;

    const brights = brightPositions.map(([bx, by, br, bc, bop]) => {
      const spikeLen = br * 10 + rand() * br * 5;
      const angles = [0, 90, 45, 135];
      const spikes = angles.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const dx = Math.cos(rad) * spikeLen;
        const dy = Math.sin(rad) * spikeLen;
        return {
          x1: +(bx - dx).toFixed(1),
          y1: +(by - dy).toFixed(1),
          x2: +(bx + dx).toFixed(1),
          y2: +(by + dy).toFixed(1),
        };
      });

      return {
        bx,
        by,
        br,
        bc,
        bop,
        spikes,
        dur: (3 + rand() * 5).toFixed(1) + "s",
        begin: (rand() * 8).toFixed(1) + "s",
      };
    });

    return { dimStars: dims, brightStars: brights };
  }, []);

  const svgScene = (
      <svg
        className="moon-svg"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        aria-label="Simulación de superficie lunar y Tierra"
      >
        <defs>
          {/* Space Background */}
          <radialGradient id="spaceBg" cx="50%" cy="60%" r="80%">
            <stop offset="0%" stopColor="#030308" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>

          {/* Deep sky nebulae */}
          <radialGradient id="nebulaGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a1a4a" stopOpacity="0.18" />
            <stop offset="40%" stopColor="#1a1535" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="nebula2Grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a1a30" stopOpacity="0.14" />
            <stop offset="60%" stopColor="#050d1a" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Earth Shading */}
          <radialGradient id="earthBase" cx="62%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#2a6fbe" />
            <stop offset="20%" stopColor="#1e5a9e" />
            <stop offset="45%" stopColor="#1a4b7a" />
            <stop offset="65%" stopColor="#163d62" />
            <stop offset="85%" stopColor="#0d2a45" />
            <stop offset="100%" stopColor="#061520" />
          </radialGradient>

          <radialGradient id="earthLand" cx="45%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#2d7a4a" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#245e38" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#1a4a2a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="earthAtmo" cx="50%" cy="50%" r="50%">
            <stop offset="78%" stopColor="#0066cc" stopOpacity="0" />
            <stop offset="88%" stopColor="#2288ff" stopOpacity="0.35" />
            <stop offset="93%" stopColor="#55aaff" stopOpacity="0.55" />
            <stop offset="97%" stopColor="#88ccff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#aaddff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="earthSpec" cx="68%" cy="32%" r="35%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#aaccff" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="earthShadow" cx="20%" cy="55%" r="65%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#000000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* SVG Filters */}
          <filter id="cloudBlur">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>

          <filter id="atmoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="brightStarGlow" x="-400%" y="-400%" width="900%" height="900%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="dustBlur">
            <feGaussianBlur stdDeviation="1" />
          </filter>

          {/* Moon Surface Gradients */}
          <linearGradient id="moonSurf" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5a5650" />
            <stop offset="20%" stopColor="#6e6a62" />
            <stop offset="50%" stopColor="#8a8578" />
            <stop offset="75%" stopColor="#9b9488" />
            <stop offset="90%" stopColor="#b0a898" />
            <stop offset="100%" stopColor="#8a8578" />
          </linearGradient>

          <linearGradient id="moonHorizon" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7a7570" stopOpacity="0.9" />
            <stop offset="15%" stopColor="#8a8578" stopOpacity="1" />
            <stop offset="100%" stopColor="#6a6560" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="moonFG" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5a5650" />
            <stop offset="30%" stopColor="#7a7570" />
            <stop offset="60%" stopColor="#9b9488" />
            <stop offset="85%" stopColor="#c0bab0" />
            <stop offset="100%" stopColor="#9b9488" />
          </linearGradient>

          <linearGradient id="satGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d0d8e0" />
            <stop offset="100%" stopColor="#8090a0" />
          </linearGradient>

          <linearGradient id="moduleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c8c0b0" />
            <stop offset="50%" stopColor="#a09880" />
            <stop offset="100%" stopColor="#706860" />
          </linearGradient>

          <radialGradient id="sunFlare" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffde0" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#ffe8a0" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#ffcc60" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <clipPath id="earthClip">
            <circle cx="1340" cy="380" r="240" />
          </clipPath>
        </defs>

        {/* Space Background */}
        <rect width="1920" height="1080" fill="url(#spaceBg)" />

        {/* Milky Way Nebulae */}
        <ellipse cx="800" cy="300" rx="600" ry="280" fill="url(#nebulaGrad)" />
        <ellipse cx="400" cy="180" rx="350" ry="200" fill="url(#nebula2Grad)" />
        <ellipse cx="1600" cy="250" rx="400" ry="200" fill="url(#nebulaGrad)" opacity="0.7" />

        {/* Dim Stars */}
        <g id="dim-stars">
          {dimStars.map((s, idx) => (
            <circle key={idx} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.opacity}>
              {s.anim && (
                <animate
                  attributeName="opacity"
                  values={`${s.opacity};${s.anim.min};${s.opacity}`}
                  dur={s.anim.dur}
                  begin={s.anim.begin}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))}
        </g>

        {/* Bright Navigational Stars with Diffraction Spikes */}
        <g id="bright-stars">
          {brightStars.map((bs, idx) => (
            <g key={idx}>
              <circle
                cx={bs.bx}
                cy={bs.by}
                r={+(bs.br * 3.5).toFixed(1)}
                fill={bs.bc}
                opacity={0.18}
                filter="url(#brightStarGlow)"
              />
              <circle cx={bs.bx} cy={bs.by} r={bs.br} fill={bs.bc} opacity={bs.bop} />
              {bs.spikes.map((sp, sIdx) => (
                <line
                  key={sIdx}
                  x1={sp.x1}
                  y1={sp.y1}
                  x2={sp.x2}
                  y2={sp.y2}
                  stroke={bs.bc}
                  strokeWidth={0.6}
                  opacity={+(bs.bop * 0.4).toFixed(2)}
                />
              ))}
              <animate
                attributeName="opacity"
                values="1;0.6;1"
                dur={bs.dur}
                begin={bs.begin}
                repeatCount="indefinite"
              />
            </g>
          ))}
        </g>

        {/* Earth in Cislunar Sky */}
        <circle
          cx="1340"
          cy="380"
          r="275"
          fill="none"
          stroke="#3399ff"
          strokeWidth="22"
          strokeOpacity="0.12"
          filter="url(#atmoGlow)"
        >
          <animate
            attributeName="stroke-opacity"
            values="0.12;0.19;0.12"
            dur="6s"
            repeatCount="indefinite"
          />
          <animate attributeName="r" values="275;278;275" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle
          cx="1340"
          cy="380"
          r="258"
          fill="none"
          stroke="#66bbff"
          strokeWidth="8"
          strokeOpacity="0.22"
        >
          <animate
            attributeName="stroke-opacity"
            values="0.22;0.32;0.22"
            dur="6s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Earth Sphere Clipped */}
        <g clipPath="url(#earthClip)">
          <circle cx="1340" cy="380" r="240" fill="url(#earthBase)" />
          {/* Continents */}
          <ellipse cx="1230" cy="310" rx="80" ry="65" fill="#2d6a40" opacity="0.55" />
          <ellipse cx="1215" cy="345" rx="55" ry="45" fill="#245a35" opacity="0.45" />
          <ellipse cx="1360" cy="295" rx="55" ry="70" fill="#2a6038" opacity="0.5" />
          <ellipse cx="1370" cy="385" rx="50" ry="80" fill="#256035" opacity="0.45" />
          <ellipse cx="1460" cy="280" rx="90" ry="60" fill="#2d6540" opacity="0.5" />
          <ellipse cx="1480" cy="330" rx="65" ry="50" fill="#245535" opacity="0.4" />
          <ellipse cx="1250" cy="435" rx="40" ry="65" fill="#2a5e35" opacity="0.4" />
          <ellipse cx="1490" cy="430" rx="45" ry="30" fill="#2a6038" opacity="0.35" />
          <ellipse cx="1340" cy="590" rx="100" ry="30" fill="#d0dce8" opacity="0.6" />
          <circle cx="1340" cy="380" r="240" fill="url(#earthLand)" />

          {/* Ice Caps */}
          <ellipse cx="1340" cy="155" rx="80" ry="22" fill="#d8e8f0" opacity="0.75" />
          <ellipse cx="1340" cy="600" rx="90" ry="20" fill="#d0dce8" opacity="0.6" />

          {/* Clouds Layer */}
          <g filter="url(#cloudBlur)" opacity="0.85">
            <ellipse cx="1270" cy="320" rx="90" ry="22" fill="#e8eef4" opacity="0.9" />
            <ellipse cx="1200" cy="338" rx="60" ry="15" fill="#dde5ee" opacity="0.8" />
            <ellipse cx="1380" cy="295" rx="75" ry="18" fill="#e5ecf5" opacity="0.85" />
            <ellipse cx="1420" cy="355" rx="85" ry="20" fill="#ddeaf5" opacity="0.8" />
            <ellipse cx="1310" cy="420" rx="70" ry="16" fill="#e0e8f0" opacity="0.75" />
            <ellipse cx="1240" cy="395" rx="55" ry="14" fill="#dce5ee" opacity="0.7" />
            <ellipse cx="1460" cy="420" rx="50" ry="13" fill="#dde6f0" opacity="0.7" />
          </g>

          {/* Specular ocean & terminator shadow */}
          <circle cx="1340" cy="380" r="240" fill="url(#earthSpec)" />
          <circle cx="1340" cy="380" r="240" fill="url(#earthShadow)" />
        </g>
        <circle cx="1340" cy="380" r="240" fill="url(#earthAtmo)" />

        {/* Orbiting Relay Satellite */}
        <g id="satellite">
          <rect x="-10" y="-5" width="20" height="10" rx="2" fill="url(#satGrad)" />
          <rect x="-38" y="-2" width="26" height="4" fill="#2a3a7a" opacity="0.9" />
          <rect
            x="-36"
            y="-3"
            width="22"
            height="6"
            fill="none"
            stroke="#4455aa"
            strokeWidth="0.5"
            opacity="0.6"
          />
          <rect x="12" y="-2" width="26" height="4" fill="#2a3a7a" opacity="0.9" />
          <rect
            x="14"
            y="-3"
            width="22"
            height="6"
            fill="none"
            stroke="#4455aa"
            strokeWidth="0.5"
            opacity="0.6"
          />
          <line x1="0" y1="-5" x2="0" y2="-12" stroke="#c0c8d0" strokeWidth="0.8" />
          <circle cx="0" cy="-12" r="2" fill="none" stroke="#c0c8d0" strokeWidth="0.8" />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="1200,290; 1250,255; 1310,235; 1375,230; 1435,240; 1485,265; 1510,300; 1500,340; 1470,375; 1420,400; 1360,415; 1295,415; 1240,400; 1200,370; 1180,335; 1180,295; 1200,290"
            dur="28s"
            repeatCount="indefinite"
          />
        </g>

        {/* Moon Surface & Regolith */}
        <ellipse
          cx="960"
          cy="470"
          rx="1200"
          ry="80"
          fill="#8a8578"
          opacity="0.18"
          filter="url(#dustBlur)"
        />

        <path
          d="M0,480 Q200,455 400,462 Q600,468 800,460 Q1000,452 1200,460 Q1400,468 1600,455 Q1800,448 1920,462 L1920,1080 L0,1080 Z"
          fill="url(#moonHorizon)"
          opacity="0.6"
        />

        <path
          d="M0,500 Q150,478 320,485 Q500,492 700,482 Q900,472 1100,480 Q1300,488 1500,476 Q1700,467 1920,478 L1920,1080 L0,1080 Z"
          fill="#7a7570"
          opacity="0.55"
        />

        <path
          d="M0,530 Q100,510 250,518 Q420,526 600,514 Q780,502 950,512 Q1120,522 1300,510 Q1480,498 1650,510 Q1800,522 1920,510 L1920,1080 L0,1080 Z"
          fill="url(#moonSurf)"
        />

        {/* Regional Mare and Variation */}
        <ellipse cx="300" cy="620" rx="250" ry="80" fill="#5a5650" opacity="0.25" />
        <ellipse cx="900" cy="650" rx="300" ry="90" fill="#6a6560" opacity="0.2" />
        <ellipse cx="1500" cy="600" rx="200" ry="70" fill="#5a5650" opacity="0.22" />
        <ellipse cx="600" cy="800" rx="350" ry="120" fill="#4e4c46" opacity="0.18" />
        <ellipse cx="1300" cy="750" rx="300" ry="100" fill="#5a5650" opacity="0.2" />

        <path
          d="M0,620 Q200,600 450,610 Q700,620 950,608 Q1200,596 1450,606 Q1700,616 1920,604 L1920,1080 L0,1080 Z"
          fill="url(#moonFG)"
          opacity="0.5"
        />

        {/* Craters */}
        <g opacity="0.75">
          <ellipse cx="250" cy="560" rx="65" ry="22" fill="#4e4c46" opacity="0.7" />
          <ellipse
            cx="250"
            cy="558"
            rx="65"
            ry="22"
            fill="none"
            stroke="#b0a898"
            strokeWidth="2"
            opacity="0.5"
          />
          <ellipse cx="250" cy="560" rx="45" ry="14" fill="#5a5850" opacity="0.6" />

          <ellipse cx="850" cy="545" rx="50" ry="17" fill="#4a4840" opacity="0.65" />
          <ellipse
            cx="850"
            cy="543"
            rx="50"
            ry="17"
            fill="none"
            stroke="#a89888"
            strokeWidth="1.5"
            opacity="0.5"
          />

          <ellipse cx="1600" cy="538" rx="55" ry="19" fill="#4e4c46" opacity="0.6" />
          <ellipse
            cx="1600"
            cy="536"
            rx="55"
            ry="19"
            fill="none"
            stroke="#b0a898"
            strokeWidth="1.5"
            opacity="0.4"
          />

          <ellipse cx="180" cy="680" rx="120" ry="40" fill="#3e3c38" opacity="0.7" />
          <ellipse
            cx="183"
            cy="675"
            rx="120"
            ry="40"
            fill="none"
            stroke="#c0bab0"
            strokeWidth="3"
            opacity="0.5"
          />
          <ellipse cx="165" cy="680" rx="90" ry="28" fill="#2a2a26" opacity="0.6" />

          <ellipse cx="960" cy="650" rx="90" ry="30" fill="#3e3c38" opacity="0.65" />
          <ellipse
            cx="963"
            cy="646"
            rx="90"
            ry="30"
            fill="none"
            stroke="#b8b0a0"
            strokeWidth="2"
            opacity="0.5"
          />

          <ellipse cx="1700" cy="670" rx="100" ry="34" fill="#3a3836" opacity="0.65" />
          <ellipse
            cx="1703"
            cy="666"
            rx="100"
            ry="34"
            fill="none"
            stroke="#bab2a2"
            strokeWidth="2.5"
            opacity="0.5"
          />
        </g>

        {/* Rocks & Boulders */}
        <g opacity="0.8">
          <polygon
            points="1750,610 1820,565 1875,580 1890,620 1860,645 1760,645 1740,632"
            fill="#9b9488"
          />
          <polygon points="1820,565 1875,580 1870,572 1823,558" fill="#b8b0a0" />
          <ellipse cx="1815" cy="643" rx="70" ry="12" fill="#2a2826" opacity="0.55" />

          <polygon
            points="680,650 730,615 775,625 785,660 740,678 685,668"
            fill="#9b9488"
          />
          <polygon points="730,615 775,625 772,616 733,607" fill="#b0a898" />
          <ellipse cx="732" cy="676" rx="52" ry="10" fill="#252320" opacity="0.5" />

          <polygon
            points="80,720 125,685 160,695 170,730 130,748 85,738"
            fill="#8a8578"
          />
          <ellipse cx="125" cy="746" rx="45" ry="9" fill="#222018" opacity="0.5" />
        </g>

        {/* Astronaut Bootprints Trail */}
        <g opacity="0.55" filter="url(#dustBlur)">
          <ellipse cx="800" cy="900" rx="12" ry="7" fill="#6a6560" transform="rotate(-15,800,900)" />
          <ellipse cx="815" cy="880" rx="12" ry="7" fill="#6a6560" transform="rotate(10,815,880)" />
          <ellipse cx="830" cy="860" rx="12" ry="7" fill="#6a6560" transform="rotate(-15,830,860)" />
          <ellipse cx="845" cy="840" rx="12" ry="7" fill="#6a6560" transform="rotate(10,845,840)" />
          <ellipse cx="860" cy="820" rx="11" ry="6" fill="#6a6560" transform="rotate(-12,860,820)" />
          <ellipse cx="872" cy="803" rx="11" ry="6" fill="#6a6560" transform="rotate(8,872,803)" />
          <ellipse cx="823" cy="895" rx="12" ry="7" fill="#6a6560" transform="rotate(10,823,895)" />
          <ellipse cx="838" cy="874" rx="12" ry="7" fill="#6a6560" transform="rotate(-15,838,874)" />
          <ellipse cx="854" cy="853" rx="11" ry="6.5" fill="#6a6560" transform="rotate(10,854,853)" />
        </g>

        {/* Lunar Lander (Artemis / Apollo Descent Module) */}
        <g transform="translate(1130,490) scale(0.6)">
          <line x1="-30" y1="0" x2="-50" y2="30" stroke="#8a8070" strokeWidth="2.5" opacity="0.75" />
          <line x1="30" y1="0" x2="50" y2="30" stroke="#8a8070" strokeWidth="2.5" opacity="0.75" />
          <ellipse cx="-50" cy="31" rx="12" ry="4" fill="#6a6560" opacity="0.75" />
          <ellipse cx="50" cy="31" rx="12" ry="4" fill="#6a6560" opacity="0.75" />
          <rect x="-28" y="-20" width="56" height="20" rx="3" fill="url(#moduleGrad)" opacity="0.8" />
          <rect x="-24" y="-18" width="22" height="16" rx="2" fill="#c8a830" opacity="0.5" />
          <rect x="2" y="-18" width="22" height="16" rx="2" fill="#b89020" opacity="0.5" />
          <rect x="-18" y="-38" width="36" height="20" rx="4" fill="#b0a890" opacity="0.85" />
          <line x1="0" y1="-38" x2="0" y2="-52" stroke="#c0b8a0" strokeWidth="1.5" opacity="0.75" />
          <line x1="32" y1="-38" x2="32" y2="-58" stroke="#c0b8a0" strokeWidth="1.5" opacity="0.8" />
          <rect x="32" y="-58" width="20" height="12" fill="#cc2222" opacity="0.75" />
        </g>
        <ellipse cx="1130" cy="508" rx="38" ry="8" fill="#2a2826" opacity="0.4" />

        {/* Off-screen Sun Lens Flare */}
        <g opacity="0.35">
          <ellipse cx="1900" cy="80" rx="80" ry="80" fill="url(#sunFlare)" />
          <line
            x1="1900"
            y1="30"
            x2="1900"
            y2="10"
            stroke="#fffde0"
            strokeWidth="2"
            strokeOpacity="0.3"
          />
        </g>
      </svg>
  );

  if (embedded) {
    return <div className="moon-view--embedded">{svgScene}</div>;
  }

  return (
    <div className="view moon-view">
      <header className="viewhead">
        <div>
          <p className="micro">LIGHTMINUTE / ENTORNO OPERATIVO LUNAR</p>
          <h1>Entorno lunar (Shackleton Rim)</h1>
          <p className="viewhead__sub">
            Simulación física de la superficie lunar a 89.9°S. Proyección orbital de la Tierra, iluminación rasante de bajo ángulo solar, flujo de radiación ambiental y telemetría de enlace directo.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {onOpenHud ? (
            <button type="button" className="btn btn--primary" onClick={onOpenHud}>
              <Icon name="visor" size={16} /> Visor EVA (HUD)
            </button>
          ) : null}
          {onOpenTablet ? (
            <button type="button" className="btn" onClick={onOpenTablet}>
              <Icon name="overview" size={16} /> Volver a resumen
            </button>
          ) : null}
        </div>
      </header>

      <div className="overview-context">
        <span>Día de misión: <strong className="mono">{String(dayNumber).padStart(2, "0")}</strong></span>
        <span>Flujo protónico: <strong className="mono">{radFlux.toFixed(1)} pfu</strong></span>
        <span>Temperatura sup.: <strong className="mono">+114°C / -130°C</strong></span>
        <span>Latencia Tierra: <strong className="mono">1.28 s (directo)</strong></span>
        <span>Gravedad: <strong className="mono">0.166 g (1/6)</strong></span>
        <span className={sepEvent ? "context-attention" : ""}>
          {sepEvent ? "Alerta: Evento SEP activo" : "Fondo GCR nominal"}
        </span>
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Cámara de superficie lunar y proyección de órbita</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Chip tone={sepEvent ? "warn" : "accent"}>{sepEvent ? "SEP ALERTA" : "NOMINAL"}</Chip>
            <button
              type="button"
              className="btn btn--tiny"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            </button>
          </div>
        </div>

        <div className={`moon-stage-frame ${isFullscreen ? "is-fullscreen" : ""}`}>
          <div className="moon-frame-overlay-top">
            <div className="moon-tag-box">
              <span className="status-dot" />
              <span>Shackleton Rim · 89.9°S, 0.0°E</span>
            </div>
            <div className="moon-frame-actions">
              {isFullscreen && (
                <button
                  type="button"
                  className="moon-fs-btn"
                  onClick={() => setIsFullscreen(false)}
                >
                  ✕ Salir de pantalla completa
                </button>
              )}
            </div>
          </div>

          <div className="moon-frame-overlay-bottom">
            <span className="moon-coord-pill">
              ALT: 1,940 m · ILUMINACIÓN: 84% PICO DE LUZ PERPETUA · G: 0.166 g
            </span>
            <span className="moon-env-notice">
              LIGHTMINUTE · DATOS SINTÉTICOS · NO ES UN DISPOSITIVO MÉDICO
            </span>
          </div>

          {svgScene}
        </div>

        <div className="moon-telemetry-grid">
          <div className="moon-metric-card">
            <span className="micro">RADIACIÓN AMBIENTAL</span>
            <strong>{radFlux.toFixed(1)} pfu</strong>
            <span className="sub">{sepEvent ? "Flujo solar incrementado (SEP)" : "Nivel cósmico de fondo"}</span>
          </div>
          <div className="moon-metric-card">
            <span className="micro">LATENCIA DE TELEMETRÍA</span>
            <strong>1.28 s</strong>
            <span className="sub">Enlace directo Tierra-Luna</span>
          </div>
          <div className="moon-metric-card">
            <span className="micro">GRADIENTE TÉRMICO</span>
            <strong>Δ 244 °C</strong>
            <span className="sub">+114°C insolación / -130°C sombra</span>
          </div>
          <div className="moon-metric-card">
            <span className="micro">ORBITADOR RELAY</span>
            <strong>Gateway Artemis</strong>
            <span className="sub">Tránsito orbital polar activo</span>
          </div>
        </div>
      </section>
    </div>
  );
}
