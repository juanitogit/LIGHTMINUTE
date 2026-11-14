# Limitaciones Científicas, Supuestos y Ética del Simulador

## 1. Naturaleza del Simulador y Seguridad Clínica
* **No es un Dispositivo Médico:** El simulador fisiológico de **LIGHTMINUTE** es una herramienta de soporte computacional y modelado dinámico para investigación y demostración de ingeniería de software. No constituye un dispositivo de diagnóstico clínico ni sustituye el criterio de un Cirujano de Vuelo (*Flight Surgeon*) de la NASA.
* **Prohibición de Diagnóstico:** Ningún estado matemático (`mild_strain`, `adapted_nominal`) equivale a una patología médica diagnosticada. Se trata de estados de balance y perturbación física del sistema dinámico.

---

## 2. Limitaciones de los Modelos por Órgano

### 2.1. Sistema Cardiovascular
* **Supuesto:** Se asume un corazón compartimental de un solo grado de libertad hemodinámico equivalente acoplado a la resistencia periférica total (TPR) y al volumen sistólico de Frank-Starling.
* **Limitación:** No resuelve las ecuaciones de Navier-Stokes en 3D para flujo turbulento intracardíaco o estrés de cizallamiento endotelial microvascular.

### 2.2. Sistema Neuro-Ocular (SANS)
* **Supuesto:** La presión intracraneal (ICP) se modela mediante el equilibrio de complacencia cráneo-espinal de Lakin y drenaje venoso hacia la vena yugular.
* **Limitación:** El síndrome SANS real en astronautas presenta una gran variabilidad interindividual genética y de vías de drenaje colateral (como el plexo vertebral). El modelo simula la tendencia esperable para un sujeto estándar de 75 kg.

### 2.3. Sistema Reproductor (Útero)
* **Decisión Metodológica Estricta:** El modelo anatómico femenino incluye la malla del útero (`uterus.glb` y `anatomy.json`). **No se ha implementado un modelo de ecuaciones diferenciales endocrinas reproductivas para microgravedad**.
* **Justificación Científica:** En la literatura abierta de la NASA y GeneLab no existen actualmente curvas cinéticas de ODE validadas sobre la dinámica estrogénica/progestágena continua en microgravedad que permitan formular un modelo predictivo riguroso. Para evitar inventar coeficientes arbitrarios sin respaldo empírico, la estructura se mantiene con la etiqueta `[DATOS REALES - LÍNEA BASE ANATÓMICA]` sin extrapolar dinámicas sintéticas.

### 2.4. Sistema Digestivo y Hepático
* El hígado se modela como el principal núcleo de termogénesis metabólica basal y acoplamiento con la temperatura corporal central ("Space Fever"). La absorción gastrointestinal detallada requiere datos de ingesta nutricional no disponibles en los canales de telemetría de la misión.

---

## 3. Incertidumbre y Calibración
* Los valores calculados con la etiqueta `[SIMULADO]` están sujetos a incertidumbre paramétrica.
* El acoplamiento entre los sensores reales (`rest_hr`, `temp_c`, `co2_ppm`) y los estados derivados actúa como un filtro de asimilación de datos (observador de estado) para mantener la simulación acotada a las lecturas fisiológicas del astronauta.
