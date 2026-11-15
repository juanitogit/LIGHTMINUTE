# Informe de Revisión y Priorización de Prototipos de Simulación Fisiológica

**Proyecto:** LIGHTMINUTE — NASA Space Apps Challenge 2026  
**Documento:** `PROTOTYPES_REVIEW_LIGHTMINUTE.md`  
**Estado:** Informe de Evaluación Técnica y Propuesta de Hoja de Ruta  
**Clasificación:** Simulado / Banco de Pruebas Autónomo  
**Aviso Legal:** *SIMULACIÓN — DATOS SINTÉTICOS — NO ES UN DISPOSITIVO MÉDICO. Las herramientas aquí documentadas son bancos de pruebas experimentales y prototipos de software orientados a la evaluación preliminar.*

---

## 1. Resumen Ejecutivo de la Investigación

En el marco de la investigación sobre sensores e instrumentación biomédica para vuelos espaciales de larga duración (LEO, Artemis y tránsitos a Marte de hasta 900 días), se evaluaron las capacidades metrológicas actuales y emergentes bajo el prisma de los cinco estresores del **NASA Human Research Program (HRP)**:
1. Gravedad alterada ($0G$ y transiciones gravitatorias).
2. Radiación del espacio profundo (GCR y SEP).
3. Aislamiento y confinamiento.
4. Distancia de la Tierra (latencia de comunicaciones de hasta 44 minutos).
5. Entornos de cabina cerrados y hostiles ($	ext{CO}_2$, patógenos y polvo).

El análisis concluyó que en misiones interplanetarias no es viable la telemedicina sincrónica ni el equipamiento hospitalario pesado (MRI, CT, DEXA). La salud de la tripulación dependerá de sistemas de **monitorización multimodal pasiva o mínimamente invasiva**, complementados con algoritmos deterministas de seguimiento bayesiano individualizado (*N-of-1 Bayesian tracking*) que aprenden la línea base de cada astronauta.

Para explorar cómo interactúan estas señales con los órganos humanos y preparar su posible integración en LIGHTMINUTE sin alterar la arquitectura actual, se implementaron **siete (7) prototipos HTML interactivos e independientes** en el directorio `simulator-prototypes/`.

---

## 2. Sensores Biomédicos e Instrumentos Espaciales Identificados

Se catalogaron 10 familias de instrumentación biomédica espacial con respaldo en misiones de la ISS o en programas de validación de la NASA/ESA/CSA:
1. **Electrocardiografía (ECG) y Monitorización Cardíaca:** Sistemas Holter y prendas biométricas inteligentes (e.g., *Astroskin/Bio-Monitor* de la CSA) con electrodos secos o de gel sólido para derivaciones continuas y análisis de variabilidad ($HRV$).
2. **Fotopletismografía Óptica (PPG) y Pulsioximetría ($SpO_2$):** Sensores de absorción bicromática (660 nm / 940 nm) de clip auricular o dactilar para perfusión capilar y oxigenación.
3. **Presión Arterial Continua y Oscilométrica (NIBP):** Manguitos braquiales y transductores de servocontrol de volumen dactilar (método de Penaz / *Portapres*) adaptados a la pérdida del gradiente hidrostático.
4. **Capnografía Infrarroja No Dispersiva (NDIR):** Analizadores espectrofotométricos de flujo lateral (e.g., *Airway Monitoring* en la ISS) para $P_{et}CO_2$ y analizadores ambientales de cabina ($ppCO_2$).
5. **Termometría Central de Doble Sensor (*Double Sensor*):** Dispositivos frontales de balance térmico conductivo de Fourier para monitorización 24h del núcleo térmico y el síndrome de *"Space Fever"*.
6. **Electroencefalografía Ambulatoria Seca (Dry-EEG):** Diademas con microelectrodos secos (e.g., *Dreem*, estudio *Sleep in Orbit*) y electrodos periauriculares (*cEEGrid*) para cuantificar arquitectura del sueño y fatiga cognitiva.
7. **Tonometría Ocular de Rebote:** Tonómetros portátiles de microsonda desacelerada (*Icare Pro / Tono-Pen*) para medir la presión intraocular ($IOP$) en microgravedad.
8. **Ecografía de Diagnóstico y Doppler Vascular:** Sondas lineales y sectoriales (plataforma *GE Vivid q* en ISS) para evaluar el diámetro de la vaina del nervio óptico ($ONSD$ a 3 mm para síndrome SANS), vena yugular interna y flujo portal hepático.
9. **Electromiografía de Superficie (sEMG) y Celdas de Carga:** Sensores inalámbricos superficiales sobre sóleo y cuádriceps sincronizados con transductores de fuerza del dispositivo de ejercicio resistivo avanzado (*ARED*).
10. **Sistemas de Análisis de Fluidos y Orina In Situ:** El colector *Urine Monitoring System (UMS)* acoplado a reflectómetros ópticos de tiras reactivas (pH, gravedad específica, calciuria) y biochips microfluídicos capilares (*i-STAT / rHEALTH*).

---

## 3. Órganos y Sistemas Monitoreables en LIGHTMINUTE

Los sensores identificados permiten alimentar y enriquecer directamente la representación fisiológica de los siguientes órganos ya existentes en el simulador 3D de LIGHTMINUTE:
- **Corazón y Árbol Vascular Sistémico:** Frecuencia cardíaca, arritmias, precarga por fluid shift cefálico, presión arterial media carotídea y desacondicionamiento miocárdico.
- **Pulmones y Vía Aérea:** Frecuencia respiratoria, capnograma alveolar, desajuste ventilación/perfusión y respuesta a la presión parcial de $	ext{CO}_2$ de cabina.
- **Cerebro y Sistema Nervioso Central:** Dinámica de bandas espectrales ($\delta, 	heta, lpha, eta$), deuda crónica de sueño profundo (N3) e índice de fatiga operativa.
- **Globos Oculares y Vaina del Nervio Óptico:** Presión intraocular ($IOP$), diámetro ecográfico $ONSD$ y riesgo de fenotipo SANS.
- **Riñones y Vía Urinaria:** Tasa de diuresis horaria, reflejo diurético de Gauer-Henry y sobresaturación de sales de oxalato de calcio ($AP[CaOx]$).
- **Músculo Esquelético y Esqueleto Axial/Apendicular:** Tono mioeléctrico $RMS$, fatiga por mediana espectral $MDF$ y balance osteocítico del mecanostato de Frost en fémur y columna lumbar.
- **Hígado y Sistema Esplácnico:** Congestión venosa en la vena porta, alteración de la velocidad Doppler y variación de la depuración metabólica de fármacos.

---

## 4. Catálogo de Prototipos HTML Desarrollados

Se crearon siete aplicaciones prototipo independientes en `simulator-prototypes/`:

```
simulator-prototypes/
├── cardiac-monitor.html           # ECG Lead II + PPG + HRV + Arritmias
├── respiratory-monitor.html       # Capnografía NDIR + Curva Fowler + SpO2 + ppCO2
├── neural-monitor.html            # Dry-EEG Fz-Cz + Potencia de Bandas + Fatiga Cognitiva
├── ocular-monitor.html            # Tonometría IOP + Corte Ecográfico 2D ONSD (SANS)
├── renal-monitor.html             # Diuresis UMS 24h + Nomograma Tiselius de Cálculos
├── musculoskeletal-monitor.html   # sEMG Sóleo + Mecanostato de Frost + Cargas ARED
└── liver-monitor.html             # Doppler Vena Porta + Farmacocinética Hepática Espacial
```

Todos los prototipos son archivos **HTML5 autónomos sin dependencias externas** (abren con doble clic o protocolo `file://`, sin conexión a internet ni CDN).

---

## 5. Descripción Detallada de Cada Prototipo

### 5.1. `cardiac-monitor.html`
- **Enfoque Fisiológico:** Acopla la despolarización bioeléctrica con la mecánica de eyección ventricular.
- **Señales Generadas:** Trazado de ECG Lead II continuo mediante modelo de dipolo cinemático de McSharry (ondas P, Q, R, S, T y ruido respiratorio) + Fotopletismograma dicroto pulsátil (PPG).
- **Controles Interactivos:** Selector de 4 escenarios (Tierra 1G, Adaptación Aguda 0G, Desacondicionamiento Crónico y Extrasístole Ventricular / Estrés EVA) y deslizadores de frecuencia cardíaca (45-150 bpm) y tono simpático.
- **Etiquetas de Procedencia:** `[SIMULADO]`, `[ESTIMADO]`, `[DERIVADO N-OF-1]`.

### 5.2. `respiratory-monitor.html`
- **Enfoque Fisiológico:** Simula la ventilación alveolar y el riesgo agudo/crónico de acumulación de dióxido de carbono en hábitats cerrados sin convección natural.
- **Señales Generadas:** Curva capnográfica alveolar de Fowler en 4 fases (espacio muerto anatómico, ascenso rápido, meseta alveolar $P_{et}CO_2$ con pendiente positiva $lpha$, e inspiración) + Trazado de esfuerzo toracoabdominal por inductancia (RIP).
- **Controles Interactivos:** Escenarios de atmósfera terrestre, cabina estándar ISS, "bolsón de $	ext{CO}_2$ estancado" por fallo de ventilación forzada en dormitorio y ejercicio en ARED; deslizadores de $ppCO_2$ ambiental (0 a 8 mmHg) y frecuencia respiratoria.

### 5.3. `neural-monitor.html`
- **Enfoque Fisiológico:** Monitorización neuroergonómica de la vigilia, la carga de trabajo atencional y la degradación del sueño profundo provocada por la pérdida de claves circadianas en órbita.
- **Señales Generadas:** Señal electroencefalográfica cortical sintética multirrítmica (canal frontocentral Fz-Cz a 250 Hz) + Descomposición espectral en tiempo real en barras de densidad de potencia ($\delta, 	heta, lpha, eta$).
- **Controles Interactivos:** Escenarios de reposo alerta con ojos cerrados, alta carga mental en operaciones de atraque/EVA, privación crónica de sueño (intrusión theta diurna) y fase de ondas lentas N3; deslizadores de fatiga y demanda atencional.

### 5.4. `ocular-monitor.html`
- **Enfoque Fisiológico:** Evaluación del Síndrome Neuro-Ocular Asociado al Vuelo Espacial (SANS), modelando la inversión del gradiente translaminar y la deformación anatómica retrobulbar.
- **Señales Generadas:** Trazado pulsátil beat-to-beat de Presión Intraocular ($IOP$) + **Renderizado esquemático 2D en Canvas de ecografía retrobulbar de alta frecuencia**, mostrando el aplanamiento de la pared escleral, el edema papilar y el calibre de la vaina del nervio óptico a 3 mm con vernier de medición.
- **Controles Interactivos:** Escenarios de pre-vuelo 1G, microgravedad aguda, fenotipo SANS crónico establecido (Grado Frisén 2) y respuesta a contramedida LBNP (presión negativa en mitad inferior del cuerpo); controles continuos de IOP y presión venosa central.

### 5.5. `renal-monitor.html`
- **Enfoque Fisiológico:** Simulación del equilibrio hidroelectrolítico y predicción biofísica del riesgo de formación de cálculos renales de oxalato cálcico por resorción ósea.
- **Señales Generadas:** Histograma circadiano horario de tasa de diuresis (mL/h) con cursor temporal dinámico + **Nomograma bidimensional de solubilidad litógena de Tiselius**, mapeando el punto de operación actual entre las zonas de subsaturación, metaestabilidad y precipitación espontánea.
- **Controles Interactivos:** Escenarios de hidratación nominal, reflejo temprano de Gauer-Henry, hipercalciuria crónica con oliguria y contramedida con citrato potásico; deslizadores de ingesta hídrica (800-3500 mL) y tasa de resorción ósea.

### 5.6. `musculoskeletal-monitor.html`
- **Enfoque Fisiológico:** Dinámica neuromuscular de activación del músculo sóleo durante ejercicio resistivo en ARED y cinética de remodelado óseo cortical/trabecular.
- **Señales Generadas:** Señal sEMG raw de alta frecuencia (2000 Hz) con envolvente RMS en ciclos concéntrico/excéntrico de sentadilla + Curva de respuesta del Mecanostato de Frost dividida en zonas de desuso, mantenimiento y osteogénesis con marcador dinámico en microdeformaciones ($\mu\epsilon$).
- **Controles Interactivos:** Escenarios de entrenamiento nominal ARED, atrofia severa por desuso, fatiga extrema en EVA (caída de frecuencia mediana $MDF$ a <55 Hz) y recuperación; deslizadores de carga mecánica y fatiga muscular acumulada.

### 5.7. `liver-monitor.html`
- **Enfoque Fisiológico:** Hemodinámica de la vena porta hepática y su impacto biofísico sobre la farmacocinética espacial y el metabolismo enzimático.
- **Señales Generadas:** Espectrograma de ecografía Doppler pulsada con modulación respiratoria y cardíaca de la vena porta hepática (cm/s) + Curva de depuración compartimental de fármacos post-dosis comparando línea base terrestre vs vuelo espacial.
- **Controles Interactivos:** Escenarios de línea base 1G, congestión vascular esplácnica por aumento de presión venosa central, hepatotoxicidad farmacológica/radiación y ajuste posológico; deslizadores de congestión esplácnica y carga de fármacos.

---

## 6. Variables Fisiológicas Representadas y Unidades

| Variable | Nombre / Símbolo | Unidad | Rango Típico Terrestre | Alteración Típica en Espacio |
|---|---|---|---|---|
| Frecuencia cardíaca | $HR$ | $	ext{bpm}$ | 60 - 80 | Taquicardia refleja 75 - 90 en primeros días |
| Variabilidad cardíaca | $RMSSD$ | $	ext{ms}$ | 30 - 65 | Disminuye 15 - 35 por tono simpático elevado |
| Presión arterial media | $MAP$ carotídea | $	ext{mmHg}$ | 85 - 95 | Aumenta +15 a +25 mmHg por fluid shift cefálico |
| Capnografía espirada | $P_{et}CO_2$ | $	ext{mmHg}$ | 35.0 - 42.0 | Sube a 42.0 - 52.0 en cabinas cerradas con $CO_2$ |
| Saturación de oxígeno | $SpO_2$ | $\%$ | 97.0 - 99.5 | Estable en cabina a 1 atm; caída ante hipoxia |
| $CO_2$ ambiental cabina | $ppCO_2$ | $	ext{mmHg}$ | 0.3 (aire libre) | 2.5 - 4.0 mmHg en ISS (límite operativo) |
| Bandas cerebrales | $\delta, 	heta, lpha, eta$ | $\%$ potencia | $lpha$ dominante reposo | Intrusión $	heta$ diurna por fatiga, caída de $\delta$ N3 |
| Presión intraocular | $IOP$ | $	ext{mmHg}$ | 11.0 - 18.0 | Aumento agudo a 18.0 - 22.0 mmHg |
| Diámetro vaina óptica | $ONSD$ @ 3mm | $	ext{mm}$ | 4.2 - 4.8 | Dilatación &gt; 5.0 hasta 6.0 mm en síndrome SANS |
| Gradiente translaminar | $\Delta P = IOP - ICP$ | $	ext{mmHg}$ | +4.0 a +8.0 | Inversión o caída cercana a 0 o negativa |
| Volumen urinario 24h | $V_{24}$ | $	ext{mL}$ | 1500 - 2200 | Diuresis inicial &gt;2500 mL; oliguria posterior |
| Calcio urinario diario | $U_{Ca}$ | $	ext{mg/d}$ | 100 - 200 | Sube masivamente a 280 - 380 mg/d por resorción |
| Riesgo litiasis renal | Índice $AP(CaOx)$ | Adimensional | &lt; 1.0 (soluble) | Supera 2.0 (zona de precipitación espontánea) |
| Amplitud muscular | $RMS$ sEMG | $\mu	ext{V}$ | 50 - 400 | Atrofia reduce reclutamiento máximo |
| Frecuencia mediana muscular | $MDF$ | $	ext{Hz}$ | 80 - 95 | Cae a 50 - 65 Hz en fatiga neuromuscular EVA |
| Tasa de pérdida ósea | $\Delta BMD$ | $\%/	ext{mes}$ | &plusmn; 0.05 | -1.0% a -1.5%/mes sin contramedidas |
| Velocidad flujo porta | $V_{portal}$ | $	ext{cm/s}$ | 18 - 28 | Cae a 12 - 16 cm/s en congestión esplácnica |
| Aclaramiento de fármacos | $Cl_{met}$ | $\%$ relativo | 100% | Retardo de 20% a 30% en eliminación |

---

## 7. Fuentes Científicas Utilizadas

1. **NASA Human Research Program (HRP):** Evidence Reports sobre Riesgo Cardiovascular, SANS, Pérdida de Sueño, Atrofia Muscular, Osteoporosis Temprana y Litiasis Renal (2017-2023).
2. **Estándares de Vuelo:** NASA-STD-3001 Vol. 2 (Human Factors, Habitability, and Environmental Health, Rev C).
3. **Literatura en Vuelo (ISS y Órbita):**
   - *Stahn & Gunga et al.* (Scientific Reports, 2017) sobre "Space Fever" y termorregulación.
   - *Marshall-Goebel et al.* (JAMA Network Open, 2019) sobre estasis y trombosis en vena yugular interna.
   - *Stenger & Laurie et al.* (JAMA Ophthalmol, 2020) sobre ecografía ONSD para SANS.
   - *Law et al.* (NASA/TP-2014-217394) sobre concentraciones operativas de $	ext{CO}_2$.
   - *Hackney et al.* (npj Microgravity, 2015) y *Frost* (Anat Rec, 2003) sobre mecanobiología ósea y muscular.
   - *Whitson et al.* (Springer, 2020) sobre riesgo nefrológico en vuelo espacial.
   - *Arbeille et al.* (Ultrasound Med Biol, 2017) y *Kast et al.* (npj Microgravity, 2023) sobre hemodinámica portal y farmacocinética.
   - *Inspiration4 Space Omics and Medical Atlas (SOMA)* (Nature Package, 2024).

---

## 8. Limitaciones de los Prototipos

1. **Aislamiento de Señales:** Cada prototipo modela un subsistema de forma independiente. En el cuerpo humano real, las señales están interconectadas (e.g., la hipercapnia respiratoria incrementa la presión intracraneal y la IOP en el ojo; la desmineralización ósea altera el calcio plasmático y la contractilidad cardíaca).
2. **Generación Sintética:** Las ondas de biopotencial (ECG, EEG, sEMG) son modelos cinemáticos biofieles parametrizados con datos de literatura aeroespacial, no registros digitalizados de un paciente real específico.
3. **Resolución Espacial de Ultrasonido:** Las vistas ecográficas retrobulbar y portal son diagramas anatómicos 2D computarizados interactivos con física de corte, no reconstrucciones volumétricas RF crudas.
4. **Propósito Demostrativo:** Ningún prototipo debe ser utilizado como herramienta de toma de decisiones médicas o diagnóstico clínico.

---

## 9. Recomendaciones de Implementación y Priorización

Para la revisión programada de mañana, se presenta la siguiente tabla de evaluación y priorización de ingeniería:

### Tabla de Priorización de Prototipos

| Prototipo | Evidencia Científica | Utilidad para LIGHTMINUTE | Complejidad Estimada | Recomendación |
|---|---|---|---|---|
| **Monitor Respiratorio y Capnografía** (`respiratory-monitor.html`) | Muy Alta (NASA-STD-3001, Law 2014, Airway Monitoring) | **Crítica**: Conecta directamente el ambiente de cabina ($	ext{CO}_2$) con síntomas de tripulación (cefalea, letargo). | **Media**: Modelo de 4 fases de Fowler e integración directa con sensores ambientales ya existentes en LIGHTMINUTE. | **PRIORIDAD 1 (Implementar primero)** |
| **Monitor Neuro-Ocular SANS** (`ocular-monitor.html`) | Muy Alta (HRP Red Risk, Stenger 2019, Mader 2020) | **Crítica**: El síndrome SANS es el riesgo médico insignia de la NASA para misiones a Marte. Enriquecería enormemente los globos oculares en el simulador 3D. | **Media**: Ecuación translaminar e indicador visual de engrosamiento ONSD con corte transversal interactivo. | **PRIORIDAD 2 (Implementar segundo)** |
| **Monitor Renal y Riesgo Litógeno** (`renal-monitor.html`) | Muy Alta (Whitson 2020, Gauer-Henry, UMS ISS) | **Alta**: La litiasis renal es una emergencia incapacitante en Marte. Muestra el desacoplamiento calcio-orina. | **Baja-Media**: Ecuaciones algebraicas de solubilidad de Tiselius $AP(CaOx)$ e histograma de balance hídrico. | **PRIORIDAD 3 (Implementar tercero)** |
| **Monitor Cardíaco Multivariable** (`cardiac-monitor.html`) | Muy Alta (HRP Cardio, Astroskin CSA, Norsk 2015) | **Alta**: Señal visualmente icónica en medicina aeroespacial. Excelente para la tarjeta de decisión de desacondicionamiento. | **Media-Alta**: Renderizado continuo de osciloscopio en el cliente y sincronización de pulsación miocárdica. | **PRIORIDAD 4** |
| **Monitor Musculoesquelético** (`musculoskeletal-monitor.html`) | Alta (Sibonga 2017, Frost 2003, Hackney 2015) | **Alta**: Valida el cumplimiento del entrenamiento diario con ARED y la atrofia del músculo sóleo. | **Media**: Modelo de mecanostato de microdeformaciones acoplado a sEMG. | **PRIORIDAD 5** |
| **Monitor Neuro-Cognitivo Dry-EEG** (`neural-monitor.html`) | Alta (HRP Sleep Risk, Dreem ESA, Dehais 2019) | **Media-Alta**: Relevante para las métricas de sueño y error operacional en turnos de trabajo críticos. | **Alta**: Síntesis espectral multibanda y filtrado FFT en frontend. | **PRIORIDAD 6** |
| **Monitor Hepático y Farmacocinética** (`liver-monitor.html`) | Media-Alta (Arbeille 2017, Kast 2023, SOMA 2024) | **Media**: Concepto biofísico avanzado que explica por qué los medicamentos actúan distinto en $0G$. | **Media-Alta**: Modelo farmacocinético compartimental acoplado a flujo Doppler. | **PRIORIDAD 7** |

---

## 10. Requisitos Técnicos para la Futura Integración en LIGHTMINUTE

Cuando se decida incorporar uno o más simuladores a la aplicación principal (`apps/crew-tablet`):
1. **Compatibilidad Estricta con Invariante Determinista:** Los modelos deben integrarse en TypeScript dentro de `apps/crew-tablet/src/physiology/models/` resolviendo ecuaciones diferenciales mediante el integrador RK4 ya operativo (`integrator.ts`), sin intervención de LLM para los cálculos numéricos.
2. **Acoplamiento con `OrganStatsPanel.tsx`:** Los gráficos interactivos pueden ser embebidos como mini-osciloscopios Canvas ligeros o sparklines SVG dentro del panel de estadísticas del órgano correspondiente al hacer clic en el visor 3D.
3. **Consumo de Telemetría Real/Sintética:** Las variables primarias ($ppCO_2$ ambiental, $HR$, $IOP$, volumen urinario) se mapearán desde la telemetría del escenario actual de LIGHTMINUTE (`missionDay`, perfiles de astronautas Crew A, B, C, D).
4. **Cero Dependencias Adicionales:** La implementación debe usar Canvas nativo o SVG sin bibliotecas externas de gráficos pesadas, manteniendo el tiempo de carga instantáneo del PWA para tablets de astronautas.
