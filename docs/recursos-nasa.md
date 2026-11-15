# Recursos, Datos y Herramientas de NASA — LIGHTMINUTE

Este documento recopila de manera exhaustiva el inventario de **recursos, conjuntos de datos, directrices y herramientas de la NASA** utilizados en el proyecto **LIGHTMINUTE**, detallando cómo se incorporaron, de qué manera inspiraron la arquitectura de la solución, y qué fuentes externas, abiertas y complementarias fueron empleadas.

---

## 1. Recursos, Conjuntos de Datos y Herramientas de NASA Utilizados

### A. NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)
* **Proveedor:** Community Coordinated Modeling Center (CCMC) / NASA Goddard Space Flight Center.
* **Portal y Documentación:** <https://ccmc.gsfc.nasa.gov/DONKI/api/> y <https://ccmc.gsfc.nasa.gov/tools/DONKI/>.
* **Endpoints integrados:**
  - `SEP`: Solar Energetic Particle events (partículas solares energéticas).
  - `CME`: Coronal Mass Ejection (eyecciones de masa coronal).
  - `FLR`: Solar Flares (erupciones solares).
  - `GST`: Geomagnetic Storms (tormentas geomagnéticas).
* **Licencia / Términos:** Datos abiertos de NASA (NASA Open Data Policy / CCMC Data Policy). Servicio público keyless (no requiere `api_key`).
* **Archivos en el proyecto:**
  - `scripts/fetch_nasa.py`: Script de ingesta determinística y generación de snapshots.
  - `data/snapshots/nasa-donki-sep.json` (11 eventos registrados).
  - `data/snapshots/nasa-donki-flr.json` (55 eventos registrados).
  - `data/snapshots/nasa-donki-cme.json` (322 eventos registrados).
  - `data/snapshots/nasa-donki-gst.json` (3 eventos registrados).
  - `data/snapshots/manifest.json`: Registro de sumas de verificación criptográfica (SHA-256).
  - `apps/crew-tablet/public/data/space-weather.json`: Archivo consolidado servido al cliente.

### B. NASA Human Research Program (HRP) — Riesgos y Evidencia Científica
* **Fuente:** NASA Human Research Program (<https://www.nasa.gov/hrp/risks> y <https://www.nasa.gov/human-system-risks>).
* **Literatura HRP citada:**
  - Patel et al., *"Red risks for a journey to the red planet"*, *npj Microgravity* (2020), PMC7645687. Define los riesgos de máxima prioridad para misiones a Marte (radiación espacial, síndrome SANS, degradación de salud conductual y nutrición).
  - NASA HRP RFI: *"Practical Ways to Monitor Astronaut Body Temperature in Low Earth Orbit"* (cerrada el 14-10-2026), sobre monitoreo continuo de temperatura central 24h y fenómeno de "Space Fever".
  - NASA HRP Evidence: *"Risk of Altered Immune System Responses"* y reactivación subclínica de herpesvirus latentes durante el vuelo espacial (<https://www.nasa.gov/reference/risk-of-altered-immune-system-responses>).
* **Base de Conocimiento:**
  - Codificado directamente en `kb/evidence.yaml` (`HRP-RISKS-OVERVIEW`, `HRP-RED-RISKS`, `HRP-CORE-TEMP-RFI`, `HRP-IMMUNE-SPACEFLIGHT-STRESSORS`, `HRP-VIRAL-REACTIVATION-SUBCLINICAL`).
  - Mapeo en `.agents/skills/nasa-hrp-risk-mapping/SKILL.md`.

### C. NASA HRP Artemis II Data Methodology Challenge
* **Fuente:** NASA Human Research Program (<https://www.nasa.gov/hrp/winners-of-nasa-hrps-artemis-ii-data-methodology-challenge/>).
* **Concepto:** Metodologías estadísticas para tripulaciones pequeñas de 4 astronautas bajo tamaño de muestra ultra-reducido ($N=4$), donde las pruebas de población clásicas ($p$-values frecuentistas) fallan por falta de potencia estadística.
* **Evidencia en KB:** `HRP-ARTEMIS2-METHODS` en `kb/evidence.yaml`.

### D. NASA OSDR (Open Science Data Repository) / GeneLab
* **Portal:** <https://osdr.nasa.gov/>
* **Conjunto de datos consultado:**
  - Estudio de la misión Inspiration4 ($n=4$ civiles en órbita LEO; ensayos clínicos y multi-ómicos; Sanders et al., *npj Microgravity* 2024, doi:10.1038/s41526-024-00393-5).
  - Transformación exploratoria de panel metabólico completo (CMP) del estudio OSD-575 en NASA OSDR.
* **Directrices:** Los datos procesados son públicos y anonimizados; los datos genómicos crudos no se acceden por restricciones de privacidad biológica.

### E. NASA-STD-3001 (Human Systems Integration Standard)
* **Fuente:** NASA Technical Standards Program (<https://standards.nasa.gov/>).
* **Alcance:**
  - Vol. 1: *Crew Health* (salud de la tripulación y estándares físicos).
  - Vol. 2: *Human Factors, Habitability, and Environmental Health* (límites de exposición a $\text{CO}_2$ en cabina, toxicología y habitabilidad).
* **Incorporación:** Guía de techos de alerta para $\text{CO}_2$ ambiental en soporte vital y criterios de desaturación de oxígeno (`kb/thresholds.json`).

---

## 2. Cómo se Incorporaron esos Recursos en el Proyecto

1. **Ingesta y Validación Determinística de Clima Espacial (Offline-first):**
   - En una misión de espacio profundo, la conectividad no puede depender de llamadas web en vivo. El script `scripts/fetch_nasa.py` extrae los eventos de DONKI (CME, llamaradas solares, partículas energéticas SEP), verifica las respuestas y genera un snapshot inmutable en `data/snapshots/` con hashes SHA-256.
   - La aplicación cliente lee este snapshot a través de `apps/crew-tablet/public/data/space-weather.json`, permitiendo a la tripulación inspeccionar el contexto de radiación solar en la vista `Radiation.tsx` sin conexión a internet y sin credenciales API.

2. **Tipado Estricto de Riesgos y Peligros de la NASA:**
   - Cada indicador biomédico en el motor de software (`services/engine/tether_engine/`) está fuertemente tipado vinculándolo con la ontología oficial de NASA HRP:
     - `hrp_risk`: `"cardiovascular"`, `"immune"`, `"behavioral"`, `"vision"`, `"bone"`, `"environment"`.
     - `hazard`: `"altered_gravity"`, `"space_radiation"`, `"isolation"`, `"distance"`, `"hostile_closed"`.
   - Ningún indicador existe como una variable aislada; todos se procesan en el contexto de los Cinco Peligros del Vuelo Espacial de la NASA.

3. **Arquitectura Matemática $N\text{-of-}1$ / Bayesiana Individualizada:**
   - En lugar de evaluar a los astronautas con límites genéricos de la población terrestre, el motor (`services/engine/tether_engine/nof1.py`) implementa la metodología premiada por el desafío de datos de Artemis II:
     - Actualizaciones conjugadas Normal-Inversa-Gamma para actualizar la media y la varianza personal de cada astronauta día a día.
     - Factor de olvido adaptativo para calibrar la aclimatación al microentorno espacial.
     - Algoritmo CUSUM (Cumulative Sum) para detectar desviaciones sutiles pero persistentes antes de que alcancen niveles de alarma aguda.

4. **Protocolos Médicos Basados en Guías Espaciales:**
   - La base de conocimiento (`kb/protocols/`) incluye procedimientos para responder a eventos espaciales reconocidos por la NASA:
     - `co2_headache_cluster.json`: Protocolo ante acumulación de $\text{CO}_2$ en compartimientos cerrados.
     - `fever_like_syndrome.json`: Manejo del síndrome de fiebre espacial / respuesta inmune alterada.
     - `neck_vein_review.json`: Evaluación de engrosamiento yugular y congestión cefálica por redistribución de fluidos.
     - `post_eva_orthostatic.json`: Manejo del desacondicionamiento cardiovascular y fatiga tras caminatas espaciales (EVA).

---

## 3. De qué Manera los Datos y Recursos de NASA Inspiraron la Solución

1. **El Problema del "Light-Minute Delay" (Retardo de Comunicación):**
   - La premisa central del proyecto nace del desafío de distancia identificado por NASA HRP para misiones tripuladas a Marte: las señales de radio tardan entre **3 y 22 minutos** por sentido (hasta 44 minutos en ida y vuelta). En una emergencia médica o evento solar SEP repentino, la tripulación **no puede depender de la telemedicina en vivo del Mission Control de Houston**.
   - Esto inspiró a **LIGHTMINUTE**: un sistema de soporte de decisiones médicas **completamente autónomo, determinístico y local**, que procesa la telemetría en el propio tablet de la nave sin necesidad de nube ni de médicos en la Tierra.

2. **La Doctrina de las "Tres Lentes" (The Three-Lens Verdict):**
   - Inspirada por la paradoja médica observada en la Estación Espacial Internacional y en los estudios de NASA GeneLab:
     - **Lente Terrestre (Earth Lens):** Reglas clínicas tradicionales de hospitales terrestres.
     - **Lente Adaptada al Espacio (Space-adapted Lens):** Variaciones normales fisiológicas producto de la microgravedad (por ejemplo, redistribución de fluidos hacia la cabeza, reducción del 15% del volumen plasmático circulante, temperatura central elevada).
     - **Lente Personal ($N\text{-of-}1$ Personal Baseline):** La propia línea base del astronauta aprendida en vuelo.
   - El sistema detecta patrones invisibles para la medicina convencional terrestre, como el patrón `hidden_in_range` (un valor dentro de los límites de un hospital terrestre, pero anómalo para ese astronauta específico en microgravedad).

3. **Inspiración en el Fenómeno de "Space Fever":**
   - La RFI de la NASA sobre monitoreo de temperatura corporal central inspiró directamente el modelo termorregulador en microgravedad: al no existir convección natural del aire en ingravidez, el calor corporal no se disipa adecuadamente a través de la piel, creando un nuevo setpoint térmico más alto durante el ejercicio y el reposo. Esto se codificó en el escenario de simulación `cmo_fever`.

---

## 4. Otros Recursos, Herramientas y Materiales Utilizados (Abiertos y Gratuitos)

Además de los recursos directos de la NASA, el proyecto integró herramientas abiertas, repositorios de investigación científica y librerías de software:

### A. Modelos Anatómicos 3D y Biología Estructural
| Recurso | Proveedor / Creador | Identificador / URL | Licencia | Rol en LIGHTMINUTE |
| :--- | :--- | :--- | :--- | :--- |
| **Modelos GLB de Órganos** (Corazón, Cerebro, Hígado, Pulmón, Riñones, Útero) | **NIH 3D Print Exchange** (National Institutes of Health) / **Human Reference Atlas (HRA) HuBMAP Consortium** (Autores: Kristen Browne, Heidi Schlehlein) | NIH 3D IDs: `3DPX-021000`, `3DPX-020960`, `3DPX-021007`, `3DPX-020974`, `3DPX-021001`, `3DPX-021002`, `3DPX-020996` | **CC BY 4.0** | Modelos 3D de alta resolución utilizados para la proyección holográfica interactiva en el panel `OrganHologram3D`. |
| **Dataset Anatómico Masculino** | **BodyParts3D** (The Database Center for Life Science, DBCLS, Japón) | <https://dbcls.rois.ac.jp/> | **CC BY 4.0** | Geometría y mallas anatómicas de referencia en `anatomy.json` y `anatomy.bin`. |
| **Dataset Anatómico Femenino** | **Visible Human Project** (National Library of Medicine, NLM) via HuBMAP Consortium | <https://www.nlm.nih.gov/research/visible/> | **CC BY 4.0** | Referencia espacial femenina para órganos y centroides tridimensionales. |
| **Malla Base Humana 3D** | **Innerscene / MakeHuman** (`human.glb`) | Male Base Mesh Rigged A-pose | **CC0 1.0 Universal** | Modelo corporal humano completo sobre el cual se orienta el visor WebGL de cuerpo entero. |

### B. Datos de Sensores y Biometría Terrestre (Proxies)
| Recurso | Proveedor | Descripción | Licencia | Rol en LIGHTMINUTE |
| :--- | :--- | :--- | :--- | :--- |
| **NOAA SWPC GOES-18** | **National Oceanic and Atmospheric Administration (NOAA)** | Flujo integral primario de protones solares ($\ge 10\text{ MeV}$) y escala S de tormentas solares (<https://services.swpc.noaa.gov/>) | **Dominio Público** (Obra del Gobierno de EE.UU.) | Datos de radiación solar real integrados en `views/Radiation.tsx` y correlacionados con la radiación de vuelo. |
| **PhysioNet MMASH Dataset** | **PhysioNet** (Rossi et al., 2020) | *Multilevel Monitoring of Activity and Sleep in Healthy People*, v1.0.0 (<https://physionet.org/content/mmash/1.0.0/>) | **ODC Open Database License (ODbL 1.0)** | Validación de calibración de intervalos bayesianos frente a ruido realista de sensores portátiles (wearables). |

### C. Herramientas de Inteligencia Artificial
* **DeepSeek V4.1 Flash (`deepseek-flash`):** Empleado como arquitectura de referencia para la generación de tarjetas de decisión clínica (`Decision Cards`) y capa opcional de explicabilidad en lenguaje natural.
* **Gemini 3.8 Flash (Medium) & Claude Sonnet 4.6 (Thinking):** Modelos de IA utilizados dentro del entorno de desarrollo Antigravity para diseño arquitectónico, depuración matemática y asistencia en ingeniería de software.
* **Política de Transparencia de IA:** El motor central de LIGHTMINUTE funciona de manera **100% determinística con `LLM_PROVIDER=none`**. La IA solo genera explicaciones narrativas y nunca determina los números, diagnósticos o niveles de urgencia médica.

### D. Stack Tecnológico de Código Abierto
* **Frontend Web:** React 18, TypeScript (modo estricto), Vite, Three.js (WebGL, renderizado 3D y GLTFLoader), OrbitControls, KaTeX (renderizado de ecuaciones LaTeX).
* **Backend y Motor Matemático:** Python 3.12, FastAPI, Pydantic, NumPy, SciPy (ecuaciones diferenciales ordinarias ODE), Pytest, Ruff.
* **Estándar de Formato:** CSS3 nativo con diseño Apple Health / NASA Glassmorphism, SVG Sparklines responsivas.

---

## 5. Tabla de Cumplimiento e Invariantes Éticos

| Requisito Ético / Regulatorio | Estado | Implementación en LIGHTMINUTE |
| :--- | :---: | :--- |
| **No es un Dispositivo Médico** | ✅ Cumplido | El software incluye advertencias visibles: *"Not a medical device. No diagnosis."* |
| **Sin Lenguaje Diagnóstico** | ✅ Cumplido | El software reporta *desviaciones fisiológicas*, *alertas de coherencia* o *patrones de respuesta*, nunca patologías clínicas cerradas. |
| **Datos 100% Etiquetados** | ✅ Cumplido | Toda la información visualizada se clasifica estrictamente en `real-public`, `proxy` o `synthetic`. No se utilizan ni almacenan datos personales reales. |
| **Trazabilidad de Citas (Evidence-Backed)** | ✅ Cumplido | Cada umbral o afirmación médica cita un identificador verificado en `kb/evidence.yaml`. Lo que no cuenta con fuente primaria se marca explícitamente como `unverified`. |
| **Independencia de Red (Zero-Network Autonomy)** | ✅ Cumplido | La aplicación puede ejecutarse en aislamiento total mediante snapshots locales verificados por hash criptográfico. |
