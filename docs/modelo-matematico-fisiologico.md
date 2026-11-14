# Modelo Matemático Fisiológico de Órganos para LIGHTMINUTE

Este documento describe en profundidad el **modelo matemático de simulación fisiológica multiorgánica**, su justificación biofísica, su implementación en código, la ubicación exacta de cada archivo que compone el sistema y su integración con el visor anatómico 3D de **LIGHTMINUTE**.

---

## 1. Propósito y Función en la Plataforma

### 1.1. ¿Qué es y para qué sirve?
El modelo matemático fisiológico de LIGHTMINUTE es un motor biofísico de computación científica en tiempo real que simula las respuestas dinámicas y adaptativas del cuerpo humano sometido al entorno de vuelo espacial:
- **Microgravedad ($0G$)**: Pérdida de los gradientes de presión hidrostática ($ \Delta P = \rho g h $), desplazamiento cefálico de fluidos corporales, atenuación del volumen plasmático, desacondicionamiento cardiovascular y resorción ósea por desuso mecánico.
- **Ambiente de cabina cerrada**: Aumento crónico o agudo de dióxido de carbono ($\text{CO}_2$ de 1500 a 3500 ppm), hipercapnia respiratoria y vasodilatación cerebral.
- **Alteraciones térmicas**: Pérdida de la convección natural del aire en ausencia de empuje boyante gravitatorio, reduciendo la disipación pasiva de calor y generando el síndrome de *"Space Fever"* (temperatura central elevada).

### 1.2. ¿Qué función cumple en el simulador 3D?
El motor actúa como el **cerebro fisiológico** detrás de la representación visual del cuerpo humano:
1. **Dinamismo Biofísico**: Convierte los modelos 3D estáticos en mallas con comportamiento fisiológico coherente: el corazón late a la frecuencia cardíaca simulada o medida, los pulmones oscilan según la frecuencia respiratoria y la presión venosa dilata los vasos principales.
2. **Coloreado PBR Científico**: Modula las propiedades de material de Three.js (color base, emisividad y rugosidad) para reflejar estados de adaptación nominal o tensión fisiológica (*mild strain*).
3. **Telemetría e Inspección Interactiva**: Al hacer clic sobre cualquier órgano en el visor 3D, el simulador consulta el estado actual del modelo matemático y despliega un panel profesional con variables numéricas, ecuaciones rectoras, gráficos de tendencia y citas bibliográficas.
4. **Determinismo Estricto (Invariante LIGHTMINUTE)**: El modelo está implementado en TypeScript puro mediante integradores numéricos deterministas. **No interviene ningún modelo de lenguaje (LLM) en el cálculo de números, estados o alertas**, garantizando reproducibilidad y funcionamiento offline con `LLM_PROVIDER=none`.

---

## 2. Mapa de Ubicación de Archivos del Simulador

Para que el simulador anatómico y su modelo matemático funcionen, intervienen los siguientes archivos organizados en el repositorio:

```
NASA-SPACE-APPS-2026/
│
├── apps/crew-tablet/src/
│   ├── components/
│   │   ├── BodyModel3D.tsx          # Visor 3D principal (Three.js, WebGL, animación, selección)
│   │   ├── OrganStatsPanel.tsx      # Panel interactivo de telemetría y ecuaciones del órgano
│   │   ├── CrewStrip.tsx            # Selector de miembros de la tripulación
│   │   ├── SyndromeStrip.tsx        # Tira de tendencia de síndrome combinado z-score
│   │   └── Icon.tsx                 # Iconografía del sistema
│   │
│   ├── physiology/                  # MOTOR MATEMÁTICO FISIOLÓGICO (Módulo Aislado)
│   │   ├── types.ts                 # Interfaces de estado, contexto de vuelo y procedencia
│   │   ├── integrator.ts            # Métodos numéricos: Runge-Kutta 4to Orden (RK4) y Euler
│   │   ├── engine.ts                # PhysiologySimulationEngine: orquestador y acoplador multiorgánico
│   │   ├── adapter.ts               # Physiology3DAdapter: mapeo de ODEs a atributos Three.js
│   │   ├── models/                  # Ecuaciones diferenciales por órgano
│   │   │   ├── cardiovascular.ts    # Hemodinámica, Frank-Starling, volemia, JVP
│   │   │   ├── neuro-ocular.ts      # SANS, presión intracraneal (ICP), gradiente translaminar
│   │   │   ├── respiratory.ts       # Balance alveolar CO2/O2, ecuación Severinghaus SpO2
│   │   │   ├── renal.ts             # Reflejo Gauer-Henry, diuresis, supresión ADH / ANP
│   │   │   ├── thermal-metabolic.ts # Termorregulación central, convección 0G ("Space Fever")
│   │   │   └── musculoskeletal.ts   # Mecanostato de Frost, resorción BMD, eflujo cálcico
│   │   └── __tests__/
│   │       └── physiology.test.ts   # Suite automatizada de pruebas unitarias y de integración
│   │
│   ├── views/
│   │   └── Glance.tsx               # Vista principal donde se embebe BodyModel3D con missionDay
│   │
│   └── apple.css                    # Estilos CSS, diseño responsive, temas claro/oscuro
│
├── apps/crew-tablet/public/assets/
│   └── anatomy/
│       ├── anatomy.json             # Metadatos, alturas y centros anatómicos (Male y Female)
│       ├── anatomy.bin              # Buffers binarios de mallas 3D (BodyParts3D y HuBMAP)
│       ├── provenance.json          # Licencias y orígenes científicos de las geometrías
│       └── uterus.glb               # Modelo 3D exclusivo de referencia femenina (HuBMAP HRA)
│
└── docs/
    └── modelo-matematico-fisiologico.md # Esta documentación técnica
```

---

## 3. Formulación Matemática de los Modelos por Órgano

Cada subsistema está modelado como un sistema dinámico compartimental expresado mediante ecuaciones diferenciales ordinarias (ODE).

### 3.1. Corazón y Sistema Cardiovascular
*Archivo:* `apps/crew-tablet/src/physiology/models/cardiovascular.ts`  
*Órganos asociados:* Corazón (`heart`), Aorta (`aorta`), Vasos sanguíneos (`blood vessels`), Venas yugulares (`right/left internal jugular vein`).

#### Dinámica de Desplazamiento Cefálico de Fluidos
En microgravedad ($g = 0$), se elimina la presión hidrostática de las extremidades inferiores, desplazando aproximadamente $1750\text{ mL}$ de volumen intersticial y vascular hacia el compartimento torácico-cefálico:

$$\frac{d V_{\text{shift}}(t)}{dt} = \frac{V_{\text{target}}(g) - V_{\text{shift}}(t)}{\tau_{\text{shift}}}$$

Donde:
- $V_{\text{target}}(g) = 1750 \cdot (1 - g)\text{ mL}$ `[SIMULADO]`
- $\tau_{\text{shift}} = 7200\text{ s}$ ($2\text{ horas}$, constante de relajación tisular)

#### Contracción de Volumen Plasmático
$$\frac{d f_{\text{plasma}}(t)}{dt} = \frac{f_{\text{target}}(g, \text{hyd}) - f_{\text{plasma}}(t)}{\tau_{\text{plasma}}}$$
- $f_{\text{target}} = 1.0 - 0.12 \cdot (1 - g) \cdot \text{hydrationFactor}$ (contracción típica del $\sim 12\%$ en vuelo).
- $\tau_{\text{plasma}} = 172800\text{ s}$ ($48\text{ horas}$).

#### Mecanismo de Frank-Starling y Presión Arterial
El volumen sistólico ($SV$) se acopla a la precarga torácica y la volemia:
$$SV(t) = SV_0 \cdot \left(1 + 0.18 \cdot \frac{V_{\text{shift}}(t)}{V_{\text{max}}}\right) \cdot f_{\text{plasma}}(t) \quad [\text{mL}]$$

$$\text{CO}(t) = \frac{\text{HR}(t) \cdot SV(t)}{1000} \quad [\text{L/min}]$$

$$\text{MAP}(t) = \text{CO}(t) \cdot \text{TPR}_{\text{eff}} \quad [\text{mmHg}]$$

#### Barorreflejo Cardíaco
$$\frac{d \text{HR}(t)}{dt} = \frac{\text{HR}_0 + K_{\text{baro}} \cdot (\text{MAP}_0 - \text{MAP}(t)) + \Delta \text{HR}_{\text{exercise}} - \text{HR}(t)}{\tau_{\text{baro}}}$$
- $\tau_{\text{baro}} = 30\text{ s}$, $K_{\text{baro}} = 0.85\text{ bpm/mmHg}$.

#### Presión Venosa Yugular (JVP)
$$JVP(t) = \max\left(1.0, \, CVP(t) + 5.5 \cdot (1 - g)\right) \quad [\text{mmHg}]$$
Refleja la ingurgitación venosa yugular documentada en la ISS por Marshall-Goebel et al. (2019), donde la JVP en reposo en $0G$ se mantiene entre $8$ y $12\text{ mmHg}$ (frente a $\sim 2\text{ mmHg}$ en bipedestación terrestre $1G$).

---

### 3.2. Cerebro, Ojos y Síndrome SANS
*Archivo:* `apps/crew-tablet/src/physiology/models/neuro-ocular.ts`  
*Órganos asociados:* Cerebro (`brain`), Ojos (`left/right eyeball`), Vaina del nervio óptico.

#### Presión Intracraneal (ICP)
En Tierra, la bipedestación induce presiones intracraneales bajas o negativas ($-2$ a $+2\text{ mmHg}$). En microgravedad, la pérdida del gradiente continuo eleva la ICP basal a niveles equivalentes a la posición supina continua ($13 - 15\text{ mmHg}$):

$$\text{ICP}_{\text{target}} = \text{ICP}_{0,\text{standing}} + 12.0 \cdot (1 - g) + \Delta \text{ICP}_{\text{CO}_2} + 0.45 \cdot (JVP - 3.0)$$

$$\Delta \text{ICP}_{\text{CO}_2} = \max\left(0, \frac{\text{CO}_{2,\text{cabin}} - 600}{1000}\right) \cdot 1.5 \quad [\text{mmHg}]$$

$$\frac{d \text{ICP}(t)}{dt} = \frac{\text{ICP}_{\text{target}} - \text{ICP}(t)}{\tau_{\text{ICP}}}$$
- $\tau_{\text{ICP}} = 1800\text{ s}$ ($30\text{ minutos}$ para la redistribución del líquido cefalorraquídeo).

#### Gradiente Translaminar Criboso (TLCPD) y Tensión del Nervio Óptico
$$\text{TLCPD} = \text{IOP} - \text{ICP}$$
- En Tierra (erguido): $\text{TLCPD} = 14.5 - 1.5 = +13.0\text{ mmHg}$ (gradiente anterior positivo normal).
- En microgravedad: $\text{TLCPD} = 14.5 - 14.0 = +0.5\text{ mmHg}$ (colapso del gradiente protector).

Este colapso sostenido genera tensión acumulativa en la vaina del nervio óptico:
$$\text{Strain}_{\text{optic}} = 1.0 + \left(\frac{\max(0, \text{ICP} - 10.0)}{10.0}\right) \cdot \left(1 - e^{-t_{\text{mission}} / 14.0}\right) \cdot 0.35$$

---

### 3.3. Pulmones e Intercambio Gaseoso Alveolar
*Archivo:* `apps/crew-tablet/src/physiology/models/respiratory.ts`  
*Órganos asociados:* Pulmones (`lung`, `lungs`, `left lung`, `right lung`).

#### Balance Dinámico de Masa de $\text{CO}_2$ Alveolar
$$\frac{d P_{A\text{CO}_2}(t)}{dt} = \frac{1}{V_{\text{alv}} \cdot 60} \cdot \left[ \frac{\dot{V}_{\text{CO}_2} \cdot (P_B - 47)}{1000} - \dot{V}_A \cdot (P_{A\text{CO}_2}(t) - P_{i\text{CO}_2}) \right]$$

Donde:
- $P_{i\text{CO}_2} = \left(\frac{\text{ppm}_{\text{CO}_2}}{10^6}\right) \cdot (P_B - 47)$: Presión parcial inspirada de $\text{CO}_2$ desde la atmósfera de la cabina.
- $\dot{V}_A = \text{RR} \cdot (V_T - V_D)$: Ventilación alveolar efectiva en $\text{L/min}$.

#### Quimiorreflejo Ventilatorio
$$\frac{d \text{RR}(t)}{dt} = \frac{\text{RR}_0 + G_{\text{chemo}} \cdot \max(0, P_{A\text{CO}_2} - 40.0) + \Delta \text{RR}_{\text{exercise}} - \text{RR}(t)}{\tau_{\text{chemo}}}$$
- $\tau_{\text{chemo}} = 10\text{ s}$, $G_{\text{chemo}} = 1.15\text{ bpm/mmHg}$.

#### Saturación Arterial de Oxígeno (Ecuación de Severinghaus)
$$P_{A\text{O}_2} = P_{i\text{O}_2} - \frac{P_{A\text{CO}_2}}{R}$$
$$\text{SpO}_2 = \frac{100}{1 + \frac{23400}{(P_{A\text{O}_2})^3 + 150 \cdot P_{A\text{O}_2}}} \quad [\%]$$

---

### 3.4. Riñones y Regulación Hidroelectrolítica
*Archivo:* `apps/crew-tablet/src/physiology/models/renal.ts`  
*Órganos asociados:* Riñones (`left kidney`, `right kidney`), Vejiga (`urinary bladder`).

#### Reflejo de Gauer-Henry
La distensión de los barorreceptores en las aurículas cardíacas provocada por el desplazamiento cefálico de fluidos suprime la secreción de Hormona Antidiurética (ADH / Vasopresina) y estimula el Péptido Natriurético Auricular (ANP):

$$\text{ADH}_{\text{suppression}} = \left(\frac{V_{\text{shift}}}{1750}\right) \cdot K_{\text{ADH}} \cdot (1 - g) \cdot e^{-t_{\text{mission}} / 4.0}$$

$$\text{ANP}_{\text{stimulation}} = \left(\frac{V_{\text{shift}}}{1750}\right) \cdot 1.4 \cdot (1 - g) \cdot e^{-t_{\text{mission}} / 4.0}$$

#### Tasa de Producción de Orina y Balance Hídrico
$$R_{\text{reabsorption}} = R_0 - 0.007 \cdot \text{ADH}_{\text{supp}} - 0.005 \cdot \text{ANP}_{\text{stim}}$$

$$\dot{V}_{\text{urine}} = \text{GFR}_0 \cdot (1 - R_{\text{reabsorption}}) \cdot 60 \quad [\text{mL/h}]$$

$$\frac{d \text{Balance}(t)}{dt} = \frac{\dot{V}_{\text{intake}} - \dot{V}_{\text{urine}} - \dot{V}_{\text{insensible}}}{3600} \quad [\text{mL/s}]$$

---

### 3.5. Hígado y Termorregulación Central ("Space Fever")
*Archivo:* `apps/crew-tablet/src/physiology/models/thermal-metabolic.ts`  
*Órganos asociados:* Hígado (`liver`).

#### Pérdida Convectiva en Microgravedad
En el espacio no existe convección natural (el aire caliente no asciende al carecer de empuje boyante), reduciendo la transferencia de calor pasiva a través de la piel en un $\sim 28\%$ (Stahn et al., 2017):

$$h_{\text{eff}} = h_0 \cdot \left[1 - 0.28 \cdot (1 - g)\right] \quad [\text{W/}^\circ\text{C}]$$

#### Ecuación de Balance Térmico
$$\frac{d T_{\text{core}}(t)}{dt} = \frac{Q_{\text{metabolic}} - \left[ h_{\text{eff}} \cdot (T_{\text{core}} - T_{\text{ambient}}) + Q_{\text{sweat}} \right]}{C_{\text{thermal}}}$$
- $C_{\text{thermal}} = 260,000\text{ J/}^\circ\text{C}$ (capacidad calorífica de un cuerpo de $75\text{ kg}$).
- $Q_{\text{sweat}} = \max(0, T_{\text{core}} - T_0) \cdot 75.0 \cdot (1 - 0.11 \cdot (1 - g))$.

---

### 3.6. Sistema Musculoesquelético y Remodelado Óseo
*Archivo:* `apps/crew-tablet/src/physiology/models/musculoskeletal.ts`  
*Órganos asociados:* Columna vertebral (`vertebral column`), Médula espinal (`spinal cord`).

#### Mecanostato de Frost y Resorción Ósea
$$L_{\text{effective}} = g + 0.85 \cdot \text{exerciseLoad}$$

$$\frac{d \text{BMD}(t)}{dt} = - \left(\frac{k_{\text{resorption}}}{100 \cdot 86400}\right) \cdot \max(0, 1 - L_{\text{effective}}) + \frac{k_{\text{exercise}} \cdot \text{exerciseLoad}}{86400}$$
- $k_{\text{resorption}} = 0.04\%\text{/día}$ ($\approx 1.2\%\text{ por cada 30 días}$ de disolución trabecular en microgravedad, Lang et al., 2004).

#### Eflujo Cálcico en Sangre y Orina
$$\text{Efflux}_{\text{Ca}^{2+}} = 180.0 + 850.0 \cdot (1 - \text{BMD}) \cdot (1 - g) \quad [\text{mg/día}]$$

---

### 3.7. Sistema Reproductor (Útero)
*Archivo de Malla:* `apps/crew-tablet/public/assets/anatomy/uterus.glb`  
*Clasificación:* `[ANATÓMICO_ESTÁTICO]` / `[DATOS REALES]`

> **Regla de Integridad Científica:** Conforme a los principios de LIGHTMINUTE de no inventar fisiología ni extrapolaciones no validadas en humanos, **no se modelaron ecuaciones dinámicas de endocrinología ovárico-uterina en microgravedad**, ya que la NASA y la literatura biomédica abierta no disponen de curvas de vuelo cuantitativas validadas para este sistema.  
> El órgano se incluye exclusivamente en la anatomía femenina (`female`) como referencia volumétrica anatómica CC BY 4.0 (HuBMAP HRA Visible Human Female) clasificada explícitamente en el panel como *"Anatomical Reference (Static)"*.

---

## 4. Método Numérico de Integración

*Archivo:* `apps/crew-tablet/src/physiology/integrator.ts`

El solucionador emplea el método de **Runge-Kutta de 4to Orden (RK4)** con subpasos internos y sujeción fisiológica (*physiological clamping*):

Para un sistema $\frac{d\vec{y}}{dt} = \vec{f}(t, \vec{y})$ con paso $h = \Delta t / N$:

$$\vec{k}_1 = \vec{f}(t, \vec{y}_n)$$
$$\vec{k}_2 = \vec{f}\left(t + \frac{h}{2}, \, \vec{y}_n + \frac{h}{2}\vec{k}_1\right)$$
$$\vec{k}_3 = \vec{f}\left(t + \frac{h}{2}, \, \vec{y}_n + \frac{h}{2}\vec{k}_2\right)$$
$$\vec{k}_4 = \vec{f}(t + h, \, \vec{y}_n + h\vec{k}_3)$$
$$\vec{y}_{n+1} = \vec{y}_n + \frac{h}{6}(\vec{k}_1 + 2\vec{k}_2 + 2\vec{k}_3 + \vec{k}_4)$$

- **Orden de Error Global:** $O(h^4)$, verificado en las pruebas unitarias contra la solución analítica exacta de decaimiento exponencial con un error menor a $10^{-5}$.
- **Sujeción de Fronteras (Clamping):** Evita divergencias numéricas o valores biológicamente imposibles (por ejemplo, frecuencias cardíacas negativas o $\text{SpO}_2 > 100\%$).

---

## 5. Acoplamiento Multiorgánico en Cascada

En cada paso de simulación, el motor `PhysiologySimulationEngine` resuelve los subsistemas en un orden causal fisiológicamente fundamentado:

```
                  ┌───────────────────────────────┐
                  │       CONTEXTO ESPACIAL       │
                  │   (gLevel=0, CO2_ppm, Day)    │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  SISTEMA CARDIOVASCULAR   │
                    │   • Desplazamiento Cefálico│
                    │   • Frank-Starling / MAP  │
                    │   • JVP Yugular Elevada   │
                    └──────┬─────────────┬──────┘
                           │             │
              ┌────────────┘             └────────────┐
              ▼                                       ▼
┌───────────────────────────┐           ┌───────────────────────────┐
│    SISTEMA NEURO-OCULAR   │           │       SISTEMA RENAL       │
│ • ICP (Presión Intracran.)│           │ • Reflejo Gauer-Henry     │
│ • Colapso TLCPD (SANS)    │           │ • Supresión ADH           │
│ • Dilatación por CO2      │           │ • Diuresis hipervolémica  │
└───────────────────────────┘           └───────────────────────────┘
              │                                       │
              ▼                                       ▼
┌───────────────────────────┐           ┌───────────────────────────┐
│    SISTEMA RESPIRATORIO   │           │    METABOLISMO TÉRMICO    │
│ • Masa alveolar de CO2    │           │ • Pérdida convectiva baja │
│ • Quimiorreflejo (RR, VT) │           │ • Space Fever (+0.8°C)    │
│ • Severinghaus SpO2       │           │ • Compensación sudorípara │
└───────────────────────────┘           └───────────────────────────┘
              │                                       │
              └───────────────┬───────────────────────┘
                              ▼
                ┌───────────────────────────┐
                │   SISTEMA ESQUELÉTICO     │
                │ • Mecanostato de Frost    │
                │ • Pérdida BMD Columna     │
                │ • Eflujo Cálcico Ca2+     │
                └───────────────────────────┘
```

---

## 6. Mapeo a la Representación Visual 3D (`adapter.ts` y `BodyModel3D.tsx`)

### 6.1. Solución al Desplazamiento Excesivo de los Órganos (Centrado de Pivotes)
Para evitar que los órganos se salieran del cuerpo al pulsar:
1. En `createOrganGeometry(data)` se calcula el centro anatómico nativo $\vec{c}_{\text{organ}}$ (de `anatomy.json`).
2. Se trasladan los vértices: $\vec{v}_{\text{local}} = \vec{v}_{\text{original}} - \vec{c}_{\text{organ}}$.
3. Se sitúa la malla en `mesh.position.set(c_x, c_y, c_z)`.
4. Al aplicar la pulsación `mesh.scale.setScalar(scale)`, **la dilatación ocurre exactamente desde su propio centroide**, sin ningún desplazamiento traslacional ($\Delta \vec{x} \equiv 0$).
5. Se limitó la amplitud máxima en runtime:
   $$\text{safeAmp} = \min(0.018, \, \text{amplitude})$$

### 6.2. Mapeo de Variables a Propiedades Gráficas PBR
- **Frecuencia Cardíaca ($\text{HR}$)** $\to$ Frecuencia de pulsación del corazón:
  $$f_{\text{pulse}} = \frac{\text{HR}}{60} \quad [\text{Hz}]$$
- **Frecuencia Respiratoria ($\text{RR}$)** $\to$ Frecuencia de excursión de los pulmones:
  $$f_{\text{lung}} = \frac{\text{RR}}{60} \quad [\text{Hz}]$$
- **Presión Venosa Yugular ($JVP$)** $\to$ Dilatación física de venas yugulares y grandes vasos:
  $$\text{Scale}_{\text{vascular}} = 1.0 + 0.03 \cdot \left(\frac{JVP}{12.0}\right)$$
- **Tensión Fisiológica (*Mild Strain*)** $\to$ Emisión PBR cálida:
  $$\text{emissiveHex} = \text{0x8f3212}, \quad \text{emissiveIntensity} = 0.35, \quad \text{roughness} = 0.35$$
- **Órgano Seleccionado por Clic** $\to$ Resaltado cian de alto contraste:
  $$\text{colorHex} = \text{0x38bdf8}, \quad \text{emissiveHex} = \text{0x0284c7}, \quad \text{emissiveIntensity} = 0.55$$

---

## 7. Ejemplos de Simulación y Resultados Numéricos

### Ejemplo 1: Astronauta en Día 2 de Misión (Fase de Redistribución Aguda)
- **Entorno:** $g = 0.0$, $\text{CO}_2 = 1800\text{ ppm}$, $\text{Día} = 2$.
- **Resultados del Modelo:**
  - $V_{\text{shift}} = 1748\text{ mL}$ (desplazamiento cefálico casi completado).
  - $JVP = 10.8\text{ mmHg}$ (ingurgitación venosa yugular activa).
  - $\text{ICP} = 14.2\text{ mmHg}$ (presión intracraneal elevada respecto a los $1.5\text{ mmHg}$ terrestres).
  - $\text{TLCPD} = 15.0 - 14.2 = +0.8\text{ mmHg}$ (gradiente translaminar criboso colapsado).
  - Diuresis: $\dot{V}_{\text{urine}} = 118\text{ mL/h}$ (reflejo de Gauer-Henry activo eliminando sobrecarga central).

### Ejemplo 2: Escenario de Hipercapnia en Cabina (`co2_creep`)
- **Entorno:** $\text{CO}_2 = 3200\text{ ppm}$, $g = 0.0$, $\text{Día} = 12$.
- **Resultados del Modelo:**
  - $P_{A\text{CO}_2} = 45.8\text{ mmHg}$ (retención alveolar de dióxido de carbono).
  - Frecuencia Respiratoria: $\text{RR} = 20.6\text{ bpm}$ (hiperventilación refleja por quimiorreceptores).
  - $\text{ICP} = 16.4\text{ mmHg}$ (vasodilatación cerebral por $\text{CO}_2$, exacerbando el riesgo SANS).
  - Visualización 3D: Los pulmones y el cerebro adquieren el estado `mild_strain` con emisión rojiza y oscilación acelerada.

### Ejemplo 3: Escenario de Síndrome Febril en Vuelo (`cmo_fever`)
- **Entorno:** Sensor de temperatura central marca $38.1^\circ\text{C}$ (Día 9).
- **Resultados del Modelo:**
  - $T_{\text{core}} = 38.10^\circ\text{C}$ `[DATOS REALES]`.
  - Disipación Térmica: Reducida por ausencia de convección en $0G$.
  - Frecuencia cardíaca por respuesta metabólica e inmune: $\text{HR} = 88\text{ bpm}$.
  - Visualización 3D: Hígado y corazón emiten en `mild_strain` y el panel `OrganStatsPanel` detalla la termodinámica del fenómeno.

---

## 8. Clasificación y Trazabilidad de los Datos

Toda variable generada y expuesta por el simulador cuenta obligatoriamente con una etiqueta de procedencia en la interfaz:

| Etiqueta | Significado | Ejemplos en el Modelo |
|---|---|---|
| `[DATOS REALES]` | Valores medidos por telemetría del astronauta o constantes empíricas publicadas por NASA. | Frecuencia cardíaca del sensor, Temperatura central, Concentración de $\text{CO}_2$, Geometría anatómica de referencia. |
| `[SIMULADO]` | Valores resultantes de la integración numérica de ecuaciones diferenciales ordinarias (RK4). | Desplazamiento cefálico torácico, Presión intracraneal (ICP), $P_{A\text{CO}_2}$ alveolar, Diuresis renal, Pérdida de BMD. |
| `[ESTIMADO]` | Parámetros calculados mediante funciones de transferencia aproximadas. | Tasa de filtración glomerular (GFR), Temperatura cutánea, Flujo cerebral relativo. |
| `[DERIVADO]` | Combinaciones analíticas directas de estados simulados y medidos. | Gasto cardíaco ($CO = HR \cdot SV / 1000$), Gradiente translaminar ($TLCPD = IOP - ICP$). |

---

## 9. Referencias Científicas (IEEE)

1. C. G. Blomqvist and H. L. Stone, "Cardiovascular adjustments to gravitational stress," in *Handbook of Physiology, Section 2: The Cardiovascular System*, J. T. Shepherd and F. M. Abboud, Eds. Bethesda, MD: American Physiological Society, 1983, pp. 1025–1063.
2. J. C. Buckey, F. A. Gaffney, L. D. Lane, B. D. Levine, D. E. Watenpaugh, S. J. Wright, C. W. Yancy, M. L. Meyer, and C. G. Blomqvist, "Central venous pressure in space," *New England Journal of Medicine*, vol. 334, no. 6, pp. 370–372, 1996.
3. K. Marshall-Goebel, E. E. Ambrosi, S. S. Laurie, D. S. Martin, B. R. Macias, and M. B. Stenger, "Assessment of jugular venous blood flow stasis and thrombosis during spaceflight," *JAMA Network Open*, vol. 2, no. 11, p. e1915011, 2019.
4. M. B. Stenger, D. S. Martin, B. R. Macias, S. S. Laurie, C. R. Gibson, et al., "Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)," in *Human Research Program Evidence Book*, NASA Johnson Space Center, Houston, TX, 2017.
5. W. D. Lakin, S. A. Stevens, B. I. Tranmer, and P. L. Penar, "A mathematical model of intracranial pressure and cerebral blood flow under microgravity," *Mathematical and Computer Modelling*, vol. 46, no. 3–4, pp. 620–639, 2007.
6. T. H. Mader, C. R. Gibson, A. J. Pass, L. A. Kramer, A. G. Lee, et al., "Optic disc edema, globe flattening, choroidal folds, and hyperopic shifts observed in astronauts after long-duration space flight," *Ophthalmology*, vol. 118, no. 10, pp. 2058–2069, 2011.
7. J. Law, S. Watkins, and D. Alexander, "Relationship Between Carbon Dioxide Levels and Reported Headaches on the International Space Station," NASA Technical Publication TP-2014-217391, NASA Lyndon B. Johnson Space Center, Houston, TX, 2014.
8. J. W. Severinghaus, "Simple, accurate equations for human blood O2 dissociation computations," *Journal of Applied Physiology*, vol. 46, no. 3, pp. 599–602, 1979.
9. O. H. Gauer and J. P. Henry, "Neurohormonal control of plasma volume," in *Cardiovascular Physiology II*, vol. 9, A. C. Guyton and A. W. Cowley, Eds. Baltimore: University Park Press, 1976, pp. 145–190.
10. A. C. Stahn, H.-C. Gunga, et al., "Increased core body temperature in astronauts during long-duration space flight," *Scientific Reports*, vol. 7, no. 1, p. 17777, 2017.
11. T. Lang, A. LeBlanc, H. Evans, Y. Lu, H. Genant, and A. Yu, "Cortical and trabecular bone mineral loss in the spine and hip in long-duration spaceflight," *Journal of Bone and Mineral Research*, vol. 19, no. 6, pp. 1006–1012, 2004.
12. H. M. Frost, "Bone's mechanostat: a 2003 update," *The Anatomical Record Part A: Discoveries in Molecular, Cellular, and Evolutionary Biology*, vol. 275A, no. 2, pp. 1081–1101, 2003.
