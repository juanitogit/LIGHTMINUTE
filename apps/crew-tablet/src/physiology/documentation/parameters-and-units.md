# Tabla de Parámetros Fisiológicos, Variables y Unidades

## 1. Variables de Entrada y Contexto Ambiental

| Variable | Unidad | Rango Típico | Clasificación | Descripción Fisiológica |
|---|---|---|---|---|
| `gLevel` | G (adim.) | 0.0 – 1.0 | `[DATOS REALES]` | Nivel de aceleración gravitatoria (0 = microgravedad, 0.166 = Luna, 1.0 = Tierra) |
| `cabinCO2_ppm` | ppm | 400 – 5000 | `[DATOS REALES]` | Concentración ambiental de CO₂ en el hábitat espacial |
| `ambientTemp_C` | °C | 18.0 – 26.0 | `[DATOS REALES]` | Temperatura ambiente de la cabina espacial |
| `missionDay` | días | 1 – 1000 | `[DATOS REALES]` | Días transcurridos desde el inicio de la misión espacial |
| `exerciseLoad` | fracción (0–1) | 0.0 – 1.0 | `[ESTIMADO]` | Carga de ejercicio físico en contramedidas (ARED, T2) |
| `hydrationFactor` | fracción | 0.7 – 1.3 | `[ESTIMADO]` | Factor de ingesta hídrica relativo a 2.5 L/día nominales |

---

## 2. Parámetros del Sistema Cardiovascular

| Parámetro | Valor Nominal | Unidad | Fuente Científica | Descripción |
|---|---|---|---|---|
| `hr0_bpm` | 65.0 | bpm | NASA-STD-3001 | Frecuencia cardíaca basal de reposo |
| `sv0_mL` | 72.0 | mL | Blomqvist & Stone (1983) | Volumen sistólico de reposo en 1G |
| `map0_mmHg` | 92.0 | mmHg | Guyton & Hall (2020) | Presión arterial media basal |
| `maxFluidShift_mL`| 1750.0 | mL | Blomqvist et al. (1983) | Desplazamiento máximo cefálico de fluidos en 0G |
| `tauShift_s` | 7200.0 (2 h) | s | Hargens & Richardson (2009)| Constante de tiempo de redistribución de fluidos |
| `tauPlasma_s` | 172800 (48 h) | s | Leach, Alfrey et al. (1996) | Constante de tiempo de contracción plasmática |
| `kBaro` | 0.85 | bpm/mmHg | Hughson et al. (2016) | Ganancia de retroalimentación barorrefleja |

---

## 3. Parámetros del Sistema Neuro-Ocular (SANS)

| Parámetro | Valor Nominal | Unidad | Fuente Científica | Descripción |
|---|---|---|---|---|
| `icp0_standing_mmHg` | 1.5 | mmHg | Lakin et al. (2007) | Presión intracraneal en bipedestación terrestre |
| `iop0_mmHg` | 14.5 | mmHg | Mader et al. (2011) | Presión intraocular basal en reposo |
| `craniospinalCompliance`| 0.85 | mL/mmHg | Ursino (1988) | Distensibilidad cráneo-espinal |
| `tauVestibular_s` | 259200 (3 d) | s | Reschke et al. (2014) | Constante de adaptación vestibular (SMS) |

---

## 4. Parámetros del Sistema Respiratorio

| Parámetro | Valor Nominal | Unidad | Fuente Científica | Descripción |
|---|---|---|---|---|
| `rr0_bpm` | 14.0 | resp/min | West (2000) | Frecuencia respiratoria basal de reposo |
| `vt0_L` | 0.52 | L | Nunn (2016) | Volumen corriente (*tidal volume*) |
| `vd0_L` | 0.15 | L | Prisk (2014) | Espacio muerto anatómico en 1G |
| `vAlv_L` | 2.4 | L | West (2000) | Volumen alveolar de reserva |
| `vCO2_mLmin` | 220.0 | mL/min | NASA HRP | Producción metabólica basal de CO₂ |
| `chemoreceptorGain` | 1.15 | bpm/mmHg | Severinghaus (1979) | Ganancia del quimiorreflejo a la hipercapnia |

---

## 5. Parámetros del Sistema Renal y Termorregulación

| Parámetro | Valor Nominal | Unidad | Fuente Científica | Descripción |
|---|---|---|---|---|
| `gfr0_mLmin` | 115.0 | mL/min | Drummer et al. (2000) | Tasa de filtración glomerular basal |
| `r0_reabsorption`| 0.991 | fracción | Norsk (2015) | Fracción nominal de reabsorción tubular de agua |
| `tCore0_C` | 36.85 | °C | Stahn et al. (2017) | Temperatura corporal central basal |
| `heatCapacity_J_C`| 260000.0 | J/°C | Gunga et al. (2016) | Capacidad calorífica corporal media (75 kg) |
| `hTransfer0_W_C` | 28.5 | W/°C | Werner (1998) | Coeficiente nominal de disipación de calor 1G |
| `microgravityImpairment` | 0.28 | fracción | Stahn et al. (2017) | Reducción del coeficiente por ausencia de convección |
