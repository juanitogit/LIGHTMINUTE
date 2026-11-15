# Investigación de Sensores Fisiológicos, Instrumentación Biomédica y Variables de Monitoreo para Misiones Espaciales

**Proyecto:** LIGHTMINUTE — NASA Space Apps Challenge 2026  
**Documento:** `SENSOR_RESEARCH_LIGHTMINUTE.md`  
**Estado:** Documento de Investigación y Especificación Pre-Implementación  
**Clasificación de Datos:** Simulado / Proxy Científico / Literatura Pública Revisada  
**Aviso Legal y Ético:** *SIMULACIÓN — DATOS SINTÉTICOS — NO ES UN DISPOSITIVO MÉDICO. Este documento sintetiza literatura aeroespacial y biomédica pública con fines educativos y de ingeniería de software; no constituye guía diagnóstica ni prescripción clínica.*

---

## 1. Introducción

La exploración espacial de larga duración (en la Estación Espacial Internacional — ISS, las misiones lunares Artemis y los futuros tránsitos interplanetarios a Marte de más de 900 días) somete al organismo humano a cinco estresores fundamentales identificados por el *Human Research Program* (HRP) de la NASA:
1. **Gravedad alterada** (microgravedad $0G$ y transiciones $1G \to 0G \to 1/6G \to 3/8G$).
2. **Radiación ionizante del espacio profundo** (rayos cósmicos galácticos [GCR] y eventos de partículas solares [SEP]).
3. **Aislamiento y confinamiento** (cronobiología perturbada, estrés psicosocial, microambiente cerrado).
4. **Distancia a la Tierra** (latencia de comunicaciones de hasta 44 minutos ida y vuelta en Marte, imposibilidad de evacuación médica de emergencia).
5. **Entornos hostiles y cerrados** (acumulación de $\text{CO}_2$, partículas en suspensión, microbiota patógena oportunista).

En misiones en órbita baja terrestre (LEO), la telemedicina en tiempo real y el apoyo de los médicos de vuelo (*Flight Surgeons*) en el Centro de Control de Misión (MCC) permiten una monitorización constante. Sin embargo, en misiones interplanetarias, el retardo lumínico impide cualquier telemetría sincrónica. La tripulación debe contar con herramientas autónomas capaces de ingerir datos de sensores biomédicos discretos y continuos, filtrar artefactos producidos por la microgravedad, rastrear la línea base personalizada de cada astronauta (*N-of-1 Bayesian tracking*) y alertar tempranamente ante desviaciones fisiológicas sin abrumar con falsas alarmas ni generar diagnósticos automatizados no certificados.

Este documento establece el estado del arte científico sobre qué sensores, instrumentos e indicadores fisiológicos son técnicamente viables en vuelo espacial, cómo se relacionan con los órganos vitales y de qué forma alimentan modelos matemáticos y simuladores dentro de la arquitectura de **LIGHTMINUTE**.

---

## 2. Objetivo de la Investigación

1. **Revisar y documentar** los principios biofísicos, operacionales y metrológicos de sensores biomédicos utilizados o investigados para vuelos espaciales tripulados.
2. **Establecer una matriz de correspondencia órgano-sensor**, identificando qué variables físicas/químicas miden, qué patologías o anomalías funcionales revelan y qué limitaciones presentan en microgravedad.
3. **Diferenciar estrictamente** entre:
   - Tecnologías actualmente en servicio en la ISS (e.g., Astroskin, Tono-Pen, ecografía de diagnóstico, analizadores Dräger).
   - Tecnologías en fase de validación técnica o investigación para Artemis/Marte (e.g., biochips microfluídicos, electroencefalografía seca de oreja [cEEGrid], monitorización continua de temperatura por doble sensor).
   - Métodos estándar de medicina terrestre no aptos o limitados en vuelo por consumo de masa, potencia, fluidos o gravedad.
   - Modelos y variables derivados que LIGHTMINUTE puede simular sintéticamente a partir de telemetría mínima.
4. **Fundamentar científicamente los prototipos HTML** desarrollados como banco de pruebas interactivo antes de su integración en el cliente principal de LIGHTMINUTE.

---

## 3. Metodología y Criterios de Selección de Fuentes

Para garantizar la máxima integridad científica y evitar la invención de umbrales, coeficientes o afirmaciones diagnósticas (en cumplimiento del estándar de LIGHTMINUTE y de las reglas de NASA Space Apps):
- **Criterio de Inclusión Primaria:** Publicaciones del NASA Human Research Program (HRP Evidence Reports), estándares médicos de vuelo (NASA-STD-3001 Vol. 1 y Vol. 2), directrices de la Oficina del Médico Jefe de la NASA (OCHMO), repositorios abiertos de datos biomédicos de la NASA (NASA OSDR / GeneLab) y reportes técnicos en NASA NTRS.
- **Criterio de Literatura Biomédica:** Revistas indexadas con revisión por pares (e.g., *npj Microgravity*, *Journal of Applied Physiology*, *Circulation*, *Frontiers in Physiology*, *Aerospace Medicine and Human Performance*).
- **Tratamiento de Datos:** Toda variable simulada debe estar parametrizada con valores fisiológicos reales documentados. Las unidades se ajustan al Sistema Internacional (SI) o al estándar clínico aeroespacial correspondiente (e.g., mmHg, bpm, $\mu\text{V}$, $\text{mL/min}$).
- **Restricción Terminológica:** Se prohíbe el lenguaje diagnóstico. Se emplean términos como *"desviación de la línea base"*, *"tensión funcional"*, *"concordancia multisensorial"* o *"patrón consistente con adaptación espacial"*.

---

## 4. Fundamentos Biofísicos de los Sensores Investigados

### 4.1. Electrocardiografía (ECG) y Monitorización Cardíaca Ambulatoria
- **Principio Biofísico:** Registro superficial de los dipolos eléctricos de despolarización y repolarización miocárdica generados por el nodo sinoauricular, nódulo AV y red de Purkinje ($P-QRS-T$).
- **Instrumentación Espacial:** En la ISS se emplean sistemas Holter portátiles, parches bioadhesivos con electrodos secos o de gel sólido de larga duración (e.g., Bio-Monitor de la Agencia Espacial Canadiense — CSA, prenda biométrica inteligente *Astroskin/Hexoskin*).
- **Variables Obtenidas:**
  - Frecuencia cardíaca instantánea ($HR$, latidos por minuto, bpm).
  - Intervalos inter-latido ($RR$, ms).
  - Variabilidad de la frecuencia cardíaca ($HRV$): $SDNN$ (desviación estándar de intervalos RR normales) y $RMSSD$ (raíz cuadrada de las diferencias cuadradas sucesivas), marcadores directos del balance simpático/parasimpático.
  - Morfología espectral: dispersión del segmento QT, ensanchamiento del complejo QRS y extrasístoles supraventriculares/ventriculares.
- **Particularidades en Microgravedad:** El desplazamiento cefálico de ~1.5 a 2 litros de sangre y líquido intersticial (*cephalad fluid shift*) aumenta transitoriamente la precarga ventricular en los primeros días, desencadenando una reducción refleja del volumen plasmático circulante (reflejo de Gauer-Henry) de un 10-15%. A largo plazo, se produce atrofia miocárdica adaptativa (-8% a -10% de masa ventricular izquierda tras 6 meses) y alteración de la regulación autonómica vagal, elevando la incidencia de taquicardias supraventriculares y desacondicionamiento ortostático al regresar a $1G$.

### 4.2. Fotopletismografía (PPG) y Pulsioximetría ($SpO_2$)
- **Principio Biofísico:** Emisión de luz en dos longitudes de onda ópticas características (típicamente $660\,\text{nm}$ en el espectro rojo para desoxihemoglobina $\text{Hb}$ y $940\,\text{nm}$ en el infrarrojo cercano para oxihemoglobina $\text{HbO}_2$). La absorción modulada por la pulsación arterial periférica permite calcular el cociente $R = (\text{AC}_{660}/\text{DC}_{660}) / (\text{AC}_{940}/\text{DC}_{940})$, transformado empíricamente en saturación arterial periférica de oxígeno ($SpO_2$).
- **Instrumentación Espacial:** Sensores de clip dactilar, transductores auriculares o sensores ópticos reflexivos en muñeca/antebrazo integrados en el traje espacial (EMU/Orion MACS).
- **Limitaciones en Espacio:** La vasoconstricción periférica por frío en cabina, la menor perfusión capilar en extremidades y los artefactos por microvibraciones o ejercicio limitan la fiabilidad de los sensores dactilares. La pulsioximetría auricular ha demostrado mayor estabilidad durante el sueño y la actividad física.

### 4.3. Presión Arterial No Invasiva (NIBP) y Presión Continua Beat-to-Beat
- **Principio Biofísico:** Oscilometría neumática mediante manguito braquial (presión sistólica $SBP$, diastólica $DBP$ y media $MAP$) o fotopletismografía tonométrica en anillo dactilar con servocontrol neumático (tecnología de Penaz / CNAP / Finapres).
- **Instrumentación Espacial:** Sistema de Presión Arterial de la ISS (Cuff-based NIBP) y dispositivos continuos experimentales tipo *Portapres* o *Cardiovector*.
- **Desafío en Vuelo:** En la Tierra, la gravedad genera un gradiente hidrostático dependiente de la postura ($\Delta P = \rho g h \approx 70\,\text{mmHg}$ entre pies y cabeza en bipedestación). En $0G$, este gradiente se anula: la presión arterial a nivel carotídeo y cerebral aumenta (~25-30 mmHg respecto a bipedestación terrestre), mientras que la presión capilar maleolar se desploma.

### 4.4. Capnografía y Analizadores de Gases Respiratorios ($P_{et}CO_2$, $ppCO_2$)
- **Principio Biofísico:** Espectroscopía infrarroja no dispersiva (NDIR) basada en la absorción diferencial de luz a $\lambda = 4.26\,\mu\text{m}$ por la molécula de $\text{CO}_2$.
- **Instrumentación Espacial:** Experimento *Airway Monitoring* (ESA/NASA en el módulo Columbus), analizadores de cabina fijos (Major Constituent Analyzer — MCA) y monitores portátiles de gases Dräger.
- **Relevancia Crítica:** En gravedad cero no existe convección térmica natural. Los astronautas expulsan $\text{CO}_2$ que forma "bolsas estancadas" de gas alrededor de la cabeza si la ventilación forzada local falla (e.g., durante el sueño o en áreas confinadas del módulo de servicio). Una presión parcial de $\text{CO}_2$ ambiental ($ppCO_2$) superior a $2.5-3.0\,\text{mmHg}$ (frente a los $0.3\,\text{mmHg}$ en la Tierra) induce cefalea, letargo, acidosis respiratoria leve y vasodilatación intracraneal que agrava el síndrome SANS.

### 4.5. Monitorización Continua de Temperatura Central (*Double Sensor* / Cápsulas Ingeribles)
- **Principio Biofísico:** La termometría superficial estándar falla al reflejar el núcleo térmico. En vuelo se emplean dos tecnologías:
  1. *Double Sensor* (Dräger/Charité Berlín): Dos sensores de temperatura de alta precisión a distancia fija separados por un aislante calibrado en la frente, resolviendo la ecuación de Fourier de conducción de calor unidimensional:
     $$q = -k \frac{dT}{dx} \implies T_{core} = T_1 + K_s (T_1 - T_2)$$
  2. Cápsulas de telemetría ingeribles (e.g., *CorTemp*): Píldora con sensor térmico y oscilador de radiofrecuencia que transmite la temperatura del tracto gastrointestinal mientras se desplaza durante 24-48 horas.
- **Fenómeno Fisiológico (*Space Fever*):** Descrito rigurosamente por Stahn y Gunga et al. (2017), la temperatura central de reposo en astronautas se incrementa progresivamente en $\sim 1.0\,^\circ\text{C}$ (alcanzando $\sim 38.0\,^\circ\text{C}$ en reposo) y supera los $40.0\,^\circ\text{C}$ durante ejercicio moderado, debido a la supresión de convección del aire, alteración de la evaporación del sudor (que se adhiere a la piel en gotas sin escurrir) y reajuste hipotalámico mediado por citoquinas proinflamatorias.

### 4.6. Electroencefalografía (EEG) y Arquitectura del Sueño
- **Principio Biofísico:** Captación mediante microelectrodos de las fluctuaciones de potencial eléctrico extracelular cortical generadas por la sumación sináptica de neuronas piramidales ($\mu\text{V}$, bandas $\delta: 0.5-4\,\text{Hz}$, $\theta: 4-8\,\text{Hz}$, $\alpha: 8-12\,\text{Hz}$, $\beta: 13-30\,\text{Hz}$, $\gamma: >30\,\text{Hz}$).
- **Instrumentación Espacial:** Tradicionalmente, la polisomnografía completa (PSG) en la ISS era prohibitiva por el tiempo de colocación de electrodos con gel conductivo. Recientemente se emplean dispositivos de electrodos secos tipo diadema (e.g., *Dreem headband*, estudio *Sleep in Orbit*) o sistemas auriculares discretos (*cEEGrid* o *Ear-EEG*).
- **Riesgo Operacional:** La alteración de los ritmos circadianos (16 amaneceres/puestas de sol cada 24 horas en la ISS), el ruido constante de bombas y ventiladores (>55 dBA) y el estrés misional causan pérdida crónica de sueño (media de 6.0-6.4 horas de sueño fragmentado por noche en tripulantes), con reducción del sueño profundo (ondas lentas N3) y aumento de la intrusión de ondas Theta durante la vigilia, incrementando el riesgo de errores operativos críticos.

### 4.7. Tonometría Ocular y Ecografía de Órbita (Sindrome SANS)
- **Principio Biofísico:**
  - Tonometría de rebote (e.g., *Icare Pro*, *Tono-Pen*): Cálculo de la presión intraocular ($IOP$, mmHg) midiendo la desaceleración de una microsonda magnetizada al contactar la córnea anestesiada o intacta.
  - Ecografía ocular de alta resolución en modo B (sonda lineal de 10-15 MHz en el ecógrafo de la ISS, GE Vivid q): Medición del diámetro de la vaina del nervio óptico ($ONSD$, mm) a una profundidad estandarizada de $3\,\text{mm}$ por detrás del polo posterior de la esclerótica.
- **El Desafío del SANS (*Spaceflight Associated Neuro-ocular Syndrome*):** En el espacio, la presión venosa central cefálica elevada y la microgravedad impiden el descenso diurno de la presión intracraneal ($ICP$). El gradiente de presión translaminar ($\Delta P = IOP - ICP$) se altera crónicamente, produciendo edema de papila (papiledema), engrosamiento de la vaina retrobulbar ($ONSD > 5.0\,\text{mm}$), pliegues coroideos y aplanamiento del polo posterior ocular, con pérdida de agudeza visual cercana en más del 60% de los astronautas de misiones prolongadas.

### 4.8. Ecografía Vascular y Multiorgánica en Vuelo
- **Principio Biofísico:** Emisión de ultrasonidos piezoeléctricos (2-12 MHz) y detección del eco de retorno, con procesamiento Doppler para medir velocidades de flujo sanguíneo ($v = \frac{\Delta f \cdot c}{2 f_0 \cos \theta}$).
- **Instrumentación Espacial:** Plataforma de ultrasonidos de diagnóstico en la ISS (*Human Research Facility Ultrasound*). Protocolos estandarizados tele-guiados por tierra para vena yugular interna (IJV), vena porta hepática, carótida y eyección ventricular izquierda.
- **Hallazgo Crítico Reciente (Marshall-Goebel et al., 2019):** El estasis venoso prolongado en la vena yugular interna en microgravedad puede provocar inversión del flujo venoso y formación de trombos asintomáticos, subrayando la necesidad de monitoreo vascular regular en misiones a Marte.

### 4.9. Electromiografía de Superficie (sEMG) y Monitoreo Musculoesquelético
- **Principio Biofísico:** Captación de los potenciales de acción de unidades motoras (MUAP) en músculos posturales antigravitatorios (e.g., músculo sóleo, gastrocnemio medial, vasto lateral y multifidus espinal).
- **Parámetros Clave:** Amplitud RMS ($\mu\text{V}$), que correlaciona con el reclutamiento de fibras y la fuerza instantánea; y la frecuencia mediana espectral ($MDF$, Hz), cuya caída refleja la velocidad de conducción muscular y la fatiga metabólica acumulada.
- **Dinámica en Vuelo:** La ausencia de carga gravitatoria constante causa atrofia muscular rápida (pérdida de hasta un 20% de volumen muscular en 14 días sin contramedidas intensivas) y transición fenotípica de fibras lentas oxidativas (Tipo I) a fibras rápidas glucolíticas (Tipo IIx). Durante el ejercicio en el dispositivo resistivo avanzado (ARED), el sEMG inalámbrico permite cuantificar si las contracciones alcanzan el umbral biofísico de protección osteomuscular.

### 4.10. Análisis Bioquímico In Situ de Fluidos (Sangre y Orina)
- **Principio Biofísico:**
  - Microfluídica de punto de atención (*Point-of-Care Testing* — POCT): Discos microfluídicos centrífugos o cartuchos capilares con microcanales pasivos (e.g., analizador *i-STAT* de Abbott, plataforma citométrica *rHEALTH*, monitor hematológico *Bio-Monitor*).
  - Reflectometría y espectrofotometría de orina: Detección óptica de cambios cromógenos en tiras reactivas (pH, gravedad específica, eritrocitos, proteínas, calcio iónico).
- **Reto de Microgravedad:** Los fluidos libres no forman menisco ni caen por gravedad; los sistemas POCT para el espacio deben operar por tensión superficial capilar forzada o bombeo de jeringa sin burbujas de gas. La resorción ósea activa libera masivamente sales minerales, duplicando la excreción de calcio urinario ($>300\,\text{mg/día}$) y elevando exponencialmente el riesgo de cólico nefrítico y litiasis por sales de oxalato o fosfato de calcio.

---

## 5. Análisis Fisiológico por Órgano y Sistema

```
                  ┌───────────────────────────────────────────────┐
                  │          ENTORNO DE VUELO ESPACIAL            │
                  │  (Microgravedad · Radiación · CO2 · Sueño)    │
                  └───────────────────────┬───────────────────────┘
                                          │
                 ┌────────────────────────┼────────────────────────┐
                 ▼                        ▼                        ▼
      ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
      │ SISTEMA CEREBRAL   │   │ SISTEMA VASCULAR   │   │ SISTEMA PULMONAR   │
      │ Y NEURO-OCULAR     │   │ Y CARDÍACO         │   │ Y AMBIENTAL        │
      ├────────────────────┤   ├────────────────────┤   ├────────────────────┤
      │ • Cefalea y SANS   │   │ • Fluid shift      │   │ • Acumulación CO2  │
      │ • IOP elevada      │   │ • Pérdida volumen  │   │ • Acidosis resp.   │
      │ • ONSD > 5.0 mm    │   │ • Atrofia miocardio│   │ • PetCO2 elevado   │
      │ • Ritmo circadiano │   │ • Arritmias        │   │ • SpO2 normal/baja │
      └──────────┬─────────┘   └──────────┬─────────┘   └──────────┬─────────┘
                 │                        │                        │
                 ▼                        ▼                        ▼
      ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
      │   SENSORES SNC     │   │ SENSORES CARDIO    │   │ SENSORES RESPIRAT. │
      │ • Tonometría Icare │   │ • ECG 3-der / Holter│   │ • Capnógrafo NDIR  │
      │ • Eco ocular ONSD  │   │ • PPG auricular/dedo│  │ • Pulsioxímetro    │
      │ • Dry-EEG / bandas │   │ • NIBP / Finapres  │   │ • Inductancia RIP  │
      └────────────────────┘   └────────────────────┘   └────────────────────┘
```

### 5.1. Corazón y Sistema Cardiovascular
- **Órgano Blanco:** Miocardio ventricular, nódulo sinoauricular, lecho arterial sistémico y capacitancia venosa central.
- **Fisiopatología Espacial:** Redistribución cefálica de volumen $\to$ hipervolemia central transitoria $\to$ disminución del péptido natriurético auricular (ANP) y sistema renina-angiotensina-aldosterona (RAAS) $\to$ contracción sostenida del volumen plasmático ($\sim -12\%$). Desacondicionamiento vascular por atenuación del tono simpático vasoconstrictor reflejo en miembros inferiores.
- **Biomarcadores Primarios:** $HR$ en reposo, variabilidad $RMSSD$, presión de pulso ($SBP - DBP$), tiempo de tránsito de onda de pulso ($PWTT$).

### 5.2. Pulmones y Mecánica Respiratoria
- **Órgano Blanco:** Alvéolos pulmonares, membrana alvéolo-capilar, gradiente ventilación/perfusión ($V_A/Q$).
- **Fisiopatología Espacial:** En la Tierra, la gravedad crea un gradiente de perfusión basal y ventilación apical. En microgravedad, la perfusión se homogeniza, aumentando el volumen de sangre capilar pulmonar y la capacidad de difusión de membrana en un 15-20%. Sin embargo, en hábitats cerrados, la ventilación pulmonar está permanentemente desafiada por el $ppCO_2$ ambiente de la cabina.
- **Biomarcadores Primarios:** Tasa respiratoria ($f_R$), $P_{et}CO_2$, saturación $SpO_2$, relación $V_A/Q$ simulada.

### 5.3. Sistema Nervioso Central y Eje Neuro-Ocular (SANS)
- **Órgano Blanco:** Corteza cerebral, sustancia blanca, vaina del nervio óptico retrobulbar, retina y coroides.
- **Fisiopatología Espacial:** Pérdida de la oscilación gravitatoria diurna de la presión intracraneal. Congestión de los senos venosos durales y de la vena yugular interna. Edema en la cabeza del nervio óptico con disminución progresiva de la agudeza visual monocular y binocular.
- **Biomarcadores Primarios:** Diámetro de la vaina retrobulbar ($ONSD$), presión intraocular ($IOP$), potencia espectral de bandas electroencefalográficas ($\delta, \theta, \alpha, \beta$), latencia de potenciales evocados visuales (VEP).

### 5.4. Riñón, Vía Urinaria y Metabolismo Hidroelectrolítico
- **Órgano Blanco:** Glomérulos renales, túbulos contorneados proximal y distal, urotelio y vejiga urinaria.
- **Fisiopatología Espacial:** Desacoplamiento de la reabsorción ósea frente a la formación (excreción urinaria masiva de fosfato y calcio). Disminución de la ingesta voluntaria de agua por mitigación del reflejo de sed. Orina concentrada altamente sobresaturada en oxalato cálcico.
- **Biomarcadores Primarios:** Volumen urinario diario, gravedad específica ($SG$), excreción urinaria de calcio ($U_{Ca}$), índice de saturación litógena $AP(CaOx)$, tasa de filtrado glomerular estimada ($eGFR$).

### 5.5. Hígado, Farmacocinética y Metabolismo Hepático
- **Órgano Blanco:** Parénquima hepático, sinusoides y sistema enzimático citocromo P450 (CYP450).
- **Fisiopatología Espacial:** La congestión pasiva hepática inducida por la elevación de la presión venosa central ($CVP$) altera el aclaramiento metabólico de fármacos de alto índice de extracción. Adicionalmente, la exposición a radiación crónica y el estrés oxidativo modifican la cinética de enzimas hepáticas como la alanina aminotransferasa (ALT) y aspartato aminotransferasa (AST).
- **Biomarcadores Primarios:** Velocidad y pulsatilidad del flujo de la vena porta por Doppler, niveles plasmáticos de ALT, AST, fosfatasa alcalina y tiempo de protrombina mediante biochips POCT.

### 5.6. Sistema Musculoesquelético y Articular
- **Órgano Blanco:** Músculos antigravitatorios axiales y de las piernas (sóleo, cuádriceps, erectores de la espina), cartílago intervertebral y trabéculas óseas de fémur proximal y vértebras L1-L4.
- **Fisiopatología Espacial:** Expansión de discos intervertebrales por descompresión elástica axial (+5 a +7 cm de estatura total en astronautas, causando lumbalgia recurrente y riesgo de hernia discal post-vuelo). Pérdida de densidad mineral ósea trabecular de hasta $1.0 - 1.5\%$ mensual sin ejercicio resistivo intenso. Atrofia miofibrilar por desuso biomecánico.
- **Biomarcadores Primarios:** Amplitud sEMG RMS, frecuencia mediana espectral ($MDF$), fuerza pico en el transductor de la barra del ARED, telopéptido carboxiterminal del colágeno tipo I en sangre/orina (NTx/CTX).

---

## 6. Matriz de Relación entre Órganos y Sensores Fisiológicos

A continuación se detalla la matriz de correspondencia requerida, fundamentada en evidencia de instrumentación espacial verificada:

| Órgano / Sistema | Sensor / Instrumento | Variable Fisiológica | Unidad | Tipo de Medición | Cambios que Permite Detectar | Limitaciones Técnicas y Ambientales | Fuente Primaria de Evidencia |
|---|---|---|---|---|---|---|---|
| **Corazón** (Cardiovascular) | ECG Holter / Prenda inteligente (*Astroskin*) | Frecuencia cardíaca ($HR$) e intervalos $RR$ | $\text{bpm}$, $\text{ms}$ | Directa (biopotencial superficial) | Taquicardias, extrasístoles ventriculares, cronobiología del sueño | Ruido por movimiento durante ejercicio; desprendimiento de electrodos en sudoración | NASA HRP Cardiovascular Risk; CSA Astroskin ISS Validation (2020) |
| **Corazón / SNA** (Autonómico) | Análisis de series de tiempo $RR$ de ECG/PPG | Variabilidad cardíaca ($SDNN$, $RMSSD$) | $\text{ms}$ | Derivada matemática (algoritmo determinista) | Dominancia simpática por estrés misional, desacondicionamiento vagal | Requiere registros estacionarios libres de arritmias ectópicas | Task Force of ESC/NASPE; Baevsky et al. (Cosmonaut HRV Studies) |
| **Vasos Sistémicos** | Manguito NIBP / Transductor de anillo Penaz | Presión arterial ($SBP$, $DBP$, $MAP$) | $\text{mmHg}$ | Estimación oscilométrica / Directa continua | Desacondicionamiento ortostático, cambios en resistencia periférica | Calibración afectada por microgravedad y movimiento de mano/brazo | NASA-STD-3001 Vol. 2; Norsk et al., *J. Appl. Physiol.* (2015) |
| **Pulmones** (Respiratorio) | Capnógrafo Infrarrojo NDIR (*Airway Monitoring*) | Presión de $\text{CO}_2$ al final de la espiración ($P_{et}CO_2$) | $\text{mmHg}$ | Directa (absorción espectrofotométrica) | Hipercapnia por bolsón de gas en cabina, hipoventilación alveolar | Condensación de vapor de agua en cánula de muestreo | Karlsson et al., ESA Airway Monitoring in Space (2019) |
| **Pulmones / Sangre** | Pulsioxímetro óptico reflexivo o de clip | Saturación periférica de oxígeno ($SpO_2$) | $\%$ | Estimación empírica calibrada | Hipoxemia en cabina hipobárica, desaturación nocturna | Hipoperfusión tisular distal por vasoconstricción térmica | NASA-STD-3001; West et al., High Altitude & Space Biology |
| **Vía Aérea / Tórax** | Pletismografía de Inductancia Torácica (RIP) | Frecuencia respiratoria ($f_R$) y patrón toracoabdominal | $\text{rpm}$, $\text{UA}$ | Directa (inductancia magnética transversal) | Taquipnea, asincronía respiratoria, apneas centrales de sueño | Desplazamiento mecánico de las bandas elásticas en microgravedad | CSA Astroskin; Verhaert et al., Sleep Breathing in Space |
| **Cerebro / Corteza** | Diadema Dry-EEG / Auricular (*cEEGrid*) | Potencial bioeléctrico cortical ($\delta, \theta, \alpha, \beta$) | $\mu\text{V}$, $\mu\text{V}^2/\text{Hz}$ | Directa (campo dipolar extracelular) | Intrusión de fatiga cognitiva, degradación de sueño profundo (N3) | Impedancia de contacto cuero cabelludo-electrodo seco; artefactos EMG | NASA HRP Sleep Risk; Dehais et al., Dry-EEG Neuroergonomics |
| **Ojo / Nervio Óptico** | Tonómetro de rebote (*Icare Pro* / *Tono-Pen*) | Presión intraocular ($IOP$) | $\text{mmHg}$ | Estimación mecánica corneal | Inversión del gradiente translaminar en síndrome SANS | Requiere destreza del operador; depende del espesor corneal central | NASA HRP SANS Evidence Report; Mader et al., *Ophthalmology* |
| **Vaina Nervio Óptico** | Ecógrafo lineal de alta frecuencia (10-15 MHz) | Diámetro vaina retrobulbar ($ONSD$) a 3 mm | $\text{mm}$ | Directa (ecografía anatómica 2D) | Hipertensión intracraneal transmitida, edema de vaina óptica | Variabilidad inter-operador en ecografía tele-guiada | Stenger et al., NASA SANS Research; Soldatos et al., *Crit Care* |
| **Cerebro / Vena Yugular** | Ecógrafo vascular Doppler pulsado | Velocidad y dirección de flujo en vena yugular interna (IJV) | $\text{cm/s}$ | Directa (frecuencia Doppler reflejada) | Estasis venoso cefálico, flujo retrógrado, riesgo de trombosis | Sensible al ángulo de insonación ($\theta$) y compresiones locales | Marshall-Goebel et al., *JAMA Network Open* (2019) |
| **Riñón / Volumen** | Colector con caudalímetro de impedancia / óptico | Flujo y volumen urinario en 24 horas | $\text{mL}$, $\text{mL/min}$ | Directa (aforador volumétrico de orina) | Deshidratación progresiva, diuresis temprana post-inyección orbital | Manipulación de líquidos en $0G$ exige bombas peristálticas/separadores | NASA Urine Monitoring System (UMS) ISS; Gauer & Henry Reflex |
| **Riñón / Litiasis** | Fotometría de reflectancia en tiras urinarias | Calcio urinario ($U_{Ca}$), gravedad específica ($SG$) | $\text{mg/24h}$, $\text{UA}$ | Directa e indirecta combinada | Sobresaturación litógena, hipercalciuria por resorción ósea | Reactivos degradables por humedad; consumibles limitados | Whitson et al., NASA Renal Stone Risk in Spaceflight |
| **Hígado / Vasos Porta** | Ecógrafo Doppler abdominal | Velocidad de flujo portal y diámetro vascular | $\text{cm/s}$, $\text{mm}$ | Directa ultrasónica | Congestión venosa esplácnica, alteración de perfusión hepática | Dificultad de posicionamiento acústico por gas intestinal flotante | NASA HRF Ultrasound Protocols; Arbeille et al., Portal Hemodynamics |
| **Hígado / Enzimas** | Cartucho microfluídico capilar (*i-STAT* / *rHEALTH*) | Transaminasas séricas (ALT, AST), Bilirrubina | $\text{U/L}$, $\text{mg/dL}$ | Directa bioquímica óptica/electroquímica | Estrés hepático oxidativo, toxicidad farmacológica acumulativa | Requiere punción capilar estéril y descarte de residuos biológicos | NASA OSDR Inspiration4 Space Omics; Peter et al., Microfluidics |
| **Músculo Esquelético** | Sensores sEMG bipolares inalámbricos | Amplitud $RMS$ y Frecuencia Mediana ($MDF$) | $\mu\text{V}$, $\text{Hz}$ | Directa (despolarización mioeléctrica superficial) | Atrofia muscular, caída de activación de unidades motoras | Artefacto por sudoración profusa durante entrenamiento en ARED | Hackney et al., NASA Muscle Atrophy Risk; De Luca et al. |
| **Hueso / Biomecánica** | Celdas de carga piezoeléctricas en el ARED | Fuerza de reacción de suelo ($GRF$) y trabajo | $\text{N}$, $\text{Joules}$ | Directa electromecánica | Estimación del estímulo mecano-transductor osteogénico | Mide la fuerza externa aplicada, no la deformación ósea interna | Sibonga et al., NASA Bone Loss Risk; Frost\s Mechanostat Model |
| **Metabolismo / Núcleo** | Sensor de flujo térmico frontal (*Double Sensor*) | Temperatura corporal central ($T_{core}$) | $^\circ\text{C}$ | Estimación biofísica conductiva calibrada | *"Space Fever"*, termorregulación deficiente, estado proinflamatorio | Requiere contacto cutáneo permanente libre de cabello o sudor | Stahn, Gunga et al., *Scientific Reports* (2017) |
| **Entorno de Cabina** | Espectrómetro NDIR / Sensor electroquímico | Presión parcial ambiental de $\text{CO}_2$ ($ppCO_2$) | $\text{mmHg}$, $\text{ppm}$ | Directa fisicoquímica | Concentración tóxica de $\text{CO}_2$, fallo de cartuchos regenerativos | Sensores puntuales no detectan gradientes si la cabina no circula aire | Law et al., *Curr Pathobiol Rep* (2014); NASA-STD-3001 |

---

## 7. Aplicabilidad y Restricciones en Misiones Espaciales

La viabilidad de implementar sensores biomédicos en misiones a la Luna y Marte no se limita a su exactitud de laboratorio; está severamente condicionada por las restricciones de ingeniería de sistemas aeroespaciales conocidas como **SWaP-C** (*Size, Weight, Power, and Consumables*):

### 7.1. Masa y Volumen
En una arquitectura hacia Marte, cada kilogramo lanzado a órbita requiere entre 10 y 20 kg de combustible en el cohete lanzador inicial. No es factible embarcar resonadores magnéticos (MRI), tomógrafos computarizados (CT) ni sistemas de absorciometría de rayos X de doble energía (DEXA) para densidad ósea. La instrumentación debe basarse en ultrasonido portátil, prendas biométricas integradas en la ropa cotidiana y dispositivos de bolsillo.

### 7.2. Consumibles y Reactivos Químicos
Los análisis de sangre convencionales de laboratorio terrestre emplean reactivos líquidos con caducidad inferior a 6 meses que requieren refrigeración a $-80\,^\circ\text{C}$ y generan residuos bioinfecciosos peligrosos. Para misiones interplanetarias de 3 años, los sensores deben basarse en métodos **no invasivos ópticos/electrofisiológicos**, o en reactivos liofilizados estables a temperatura ambiente con microfluídica capilar cerrada.

### 7.3. Tiempo de Tripulación (*Crew Overhead*)
El tiempo de los astronautas es el recurso más escaso de la misión. Los procedimientos que demandan más de 15 minutos de preparación (como colocarse una gorra de EEG con gel conductor y limpieza posterior) son inviables para monitorización rutinaria. Se priorizan tecnologías de colocación pasiva (*wear-and-forget*) o mediciones integradas en el mobiliario de descanso o en la ropa de ejercicio.

### 7.4. Microgravedad y Comportamiento de Fluidos
En ausencia de gravedad, la tensión superficial gobierna el comportamiento de los líquidos. Cualquier extracción de sangre capilar o toma de muestra de orina puede formar gotas esféricas que flotan libremente en la cabina si el sistema no está herméticamente sellado, introduciendo riesgos biológicos y de cortocircuito en los equipos aviónicos.

---

## 8. Limitaciones Técnicas y Científicas

Al interpretar datos fisiológicos en vuelo espacial, los modelos computacionales de LIGHTMINUTE deben considerar las siguientes trampas metrológicas:

1. **Desplazamiento de Líquidos Cefálico (*Cephalad Fluid Shift*):** Altera la calibración estándar de métodos de bioimpedancia y oscilometría calibrados para la bipedestación terrestre en $1G$. Un valor de presión braquial idéntico al de la Tierra se asocia a una perfusión cerebral significativamente mayor en microgravedad.
2. **Artefactos por Movimiento y Microvibraciones:** En la microgravedad de la ISS, los astronautas se desplazan impulsándose con las manos y pies contra los mamparos, generando picos de aceleración mecánica de alta frecuencia que contaminan registros de ECG, PPG y acelerometría torácica.
3. **Pérdida de Correlación Gravitatoria en Biomarcadores Indirectos:** En la Tierra, la densidad de la orina correlaciona directamente con la deshidratación debido al gradiente osmótico córtico-medular estable. En microgravedad, la redistribución hemodinámica y la alteración de la síntesis de vasopresina (ADH) desacoplan transitoriamente la densidad urinaria del volumen intravascular real.
4. **Variabilidad Interindividual Drástica ($N\text{-of-}1$ Necessity):** Como demostró el *NASA Twins Study* (Garrett-Bakelman et al., *Science* 2019) y la cohorte civil *Inspiration4* (Nature Space Omics Package 2024), dos astronautas expuestos a idéntica cabina responden con magnitudes radicalmente distintas en pérdida ósea, hipertensión venosa y disfunción ocular. Los umbrales clínicos universales poblacionales producen una tasa inaceptable de falsos positivos o falsos negativos; se requiere el rastreo probabilístico bayesiano de la línea base propia de cada tripulante.

---

## 9. Oportunidades de Nuevos Simuladores para LIGHTMINUTE

A partir de la matriz de evidencia y de las limitaciones identificadas, se seleccionan **siete (7) subsistemas de monitorización fisiológica** con suficiente respaldo científico para ser modelados en prototipos interactivos independientes:

1. **Monitor Cardíaco Multivariable (`cardiac-monitor.html`):**
   - Combina trazo de ECG dinámico (modelo cinemático de dipolo cardíaco), cálculo de taquicardia/bradicardia y variabilidad $RMSSD$ con escenarios de adaptación temprana, desacondicionamiento por vuelo crónico y arritmia por estrés.
2. **Monitor Respiratorio y Capnográfico (`respiratory-monitor.html`):**
   - Modela la curva de capnografía alveolar ($P_{et}CO_2$), frecuencia respiratoria, saturación $SpO_2$ y la influencia crítica de la presión ambiental de dióxido de carbono ($ppCO_2$).
3. **Monitor Neuro-Cognitivo y Electroencefalográfico (`neural-monitor.html`):**
   - Sintetiza actividad oscilatoria cortical en tiempo real, descomponiendo la potencia espectral en bandas ($\delta, \theta, \alpha, \beta$) y derivando un índice de fatiga cognitiva y vigilia operacional para astronautas en turnos críticos.
4. **Monitor Neuro-Ocular y Síndrome SANS (`ocular-monitor.html`):**
   - Representa la relación acoplada entre presión intraocular ($IOP$), diámetro ecográfico de la vaina del nervio óptico ($ONSD$) y gradiente translaminar retrobulbar, visualizando el fenotipo de congestión ocular en microgravedad.
5. **Monitor Renal, Hidroelectrolítico y Riesgo Litógeno (`renal-monitor.html`):**
   - Simula la tasa de flujo urinario, densidad específica, excreción masiva de calcio por desmineralización ósea y el índice de saturación litógena $AP[CaOx]$ causante de nefrolitiasis en astronautas.
6. **Monitor Musculoesquelético y Carga Neuromuscular (`musculoskeletal-monitor.html`):**
   - Acopla electromiografía de superficie ($sEMG$ $RMS$ y frecuencia mediana $MDF$) en el músculo sóleo con celdas de fuerza resistiva y la cinética de resorción ósea basada en el mecanostato de Frost.
7. **Monitor de Función Hepática y Farmacocinética (`liver-monitor.html`):**
   - Modela la hemodinámica de la vena porta hepática (velocidad Doppler y congestión vascular esplácnica) y su impacto en la tasa metabólica de depuración de fármacos y enzimas celulares (ALT/AST).

---

## 10. Conclusiones

1. **La telemetría biomédica espacial es intrínsecamente multimodal e indirecta:** Ningún sensor individual proporciona una imagen completa del estado del astronauta. La detección temprana de anomalías requiere fusionar señales eléctricas (ECG/sEMG), biofísicas ópticas (PPG/Capnografía), mecánicas (tonometría/fuerza) y ambientales de cabina ($ppCO_2$).
2. **El rigor científico exige transparencia en la procedencia de los datos:** Cada valor visualizado por LIGHTMINUTE debe clasificarse de manera visible e inequívoca como `[DATOS REALES]`, `[SIMULADO]`, `[ESTIMADO]` o `[DERIVADO]`.
3. **Principio Ético Fundamental:** Los prototipos computacionales desarrollados a continuación no diagnostican enfermedades; proporcionan a la tripulación una visualización comprensible de su propia trayectoria adaptativa respecto a su línea base personalizada, preservando la seguridad y la autonomía operacional en el espacio profundo.

---

## 11. Referencias Bibliográficas (Formato IEEE)

1. [HRP-RISKS] NASA Human Research Program, *"Human Research Program Human Health and Performance Risks,"* NASA Technical Reports, Houston, TX, Jul. 2023. [Online]. Disponible: https://www.nasa.gov/hrp/risks
2. [NASA-STD-3001] National Aeronautics and Space Administration, *"NASA Spaceflight Human-System Standard: Volume 2: Human Factors, Habitability, and Environmental Health,"* NASA-STD-3001, Rev. C, Washington, D.C., 2022.
3. [OCHMO] NASA Office of the Chief Health and Medical Officer, *"Clinical Practice Guidelines for Exploration Spaceflight,"* OCHMO-CPG-2021-01, 2021.
4. [STAHN-2017] A. C. Stahn, D. L. Pustovrh, H.-C. Gunga, et al., *"Increased core body temperature in astronauts during long-duration space missions,"* *Scientific Reports*, vol. 7, no. 1, p. 17290, Dec. 2017. doi: 10.1038/s41598-017-15568-1.
5. [STENGER-2019] M. B. Stenger, S. S. Laurie, A. P. Sargsyan, et al., *"Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS),"* NASA Human Research Program Evidence Report, Houston, TX, 2019.
6. [MARSHALL-2019] K. Marshall-Goebel, S. S. Laurie, F. A. Alferova, et al., *"Assessment of Jugular Venous Blood Stasis and Thrombosis During Spaceflight,"* *JAMA Network Open*, vol. 2, no. 11, p. e1915011, Nov. 2019. doi: 10.1001/jamanetworkopen.2019.15011.
7. [WHITSON-2020] P. A. Whitson, R. A. Pietrzyk, and C. F. Sams, *"Spaceflight and the Risk of Renal Stone Formation,"* in *Principles of Clinical Medicine for Space Flight*, M. R. Barratt et al., Eds., New York: Springer, 2020, pp. 453-472.
8. [HACKNEY-2015] K. J. Hackney, J. M. Scott, M. W. Downs, and L. Ploutz-Snyder, *"The effect of spaceflight on skeletal muscle volume, strength, and endurance: A review,"* *npj Microgravity*, vol. 1, p. 15013, 2015. doi: 10.1038/npjmgrav.2015.13.
9. [FROST-2003] H. M. Frost, *"Bone\s mechanostat: a 2003 update,"* *The Anatomical Record*, vol. 275A, no. 2, pp. 1081-1101, Dec. 2003. doi: 10.1002/ar.a.10119.
10. [NORSK-2015] P. Norsk, P. Asmar, M. Damgaard, and N. J. Christensen, *"Fluid shifts, vasodilatation and ambulatory blood pressure in space,"* *Journal of Physiology*, vol. 593, no. 3, pp. 573-584, Feb. 2015. doi: 10.1113/jphysiol.2014.284869.
11. [LAW-2014] J. Law, S. Watkins, and D. Alexander, *"In-flight carbon dioxide exposures and related symptoms: Association, measurement, and operational implications,"* *NASA Technical Publication*, NASA/TP-2014-217394, 2014.
12. [OSDR-I4] E. E. Bezdan, C. Mason, et al., *"The Space Omics and Medical Atlas (SOMA) across orbits,"* *Nature*, vol. 630, pp. 605-618, Jun. 2024. doi: 10.1038/s41586-024-07639-2.
13. [DEHAIS-2019] F. Dehais, A. Duprès, S. Blum, et al., *"Monitoring Cognitive Workload in Real-World Environments With Dry-EEG Technology,"* *Frontiers in Neuroscience*, vol. 13, p. 701, Jul. 2019. doi: 10.3389/fnins.2019.00701.
14. [CSA-ASTROSKIN] Canadian Space Agency, *"Bio-Monitor and Astroskin: Continuous Health Telemetry in Orbit,"* Government of Canada Technical Briefing, ISS Expedition 58/59, 2020. [Online]. Disponible: https://www.asc-csa.gc.ca/eng/iss/bio-monitor.asp
