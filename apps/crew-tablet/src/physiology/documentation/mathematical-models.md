# Modelos Matemáticos de Simulación Fisiológica para Órganos en Microgravedad

## 1. Marco General de Formulación
El motor de simulación de órganos de **LIGHTMINUTE** modela la dinámica adaptativa humana en exploración espacial mediante sistemas acoplados de ecuaciones diferenciales ordinarias (ODE) y modelos compartimentales de espacio de estados:

$$\\frac{d\\vec{x}_i(t)}{dt} = \\vec{f}_i(\\vec{x}_i(t), \\vec{u}(t), \\vec{e}(t), \\vec{\\theta}_i)$$

Donde:
* $\\vec{x}_i(t)$: Vector de estado fisiológico del órgano o sistema $i$.
* $\\vec{u}(t)$: Estímulos fisiológicos (actividad física, carga de ejercicio, ingesta de fluidos).
* $\\vec{e}(t)$: Condiciones ambientales del hábitat espacial (nivel gravitacional $g$, concentración de $\\text{CO}_2$ en cabina, temperatura ambiente).
* $\\vec{\\theta}_i$: Parámetros biomédicos específicos y constantes fisiológicas.

---

## 2. Sistema Cardiovascular y Hemodinámica
**Órganos:** Corazón, Aorta, Venas Yugulares Internas, Vasculatura Periférica.

### 2.1. Desplazamiento Cefálico de Fluidos (*Cephalad Fluid Shift*)
Al eliminarse el gradiente hidrostático $\\rho g h$ en microgravedad ($g = 0$), aproximadamente 1.5–2.0 L de sangre y líquido intersticial de los miembros inferiores migran hacia la cavidad torácica y la cabeza:
$$\\frac{d V_{\\text{thoracic}}(t)}{dt} = \\frac{V_{\\text{max}}(1 - g) - V_{\\text{thoracic}}(t)}{\\tau_{\\text{shift}}}$$
* $V_{\\text{max}} = 1750\\text{ mL}$: volumen máximo de redistribución cefálica (Blomqvist & Stone, 1983).
* $\\tau_{\\text{shift}} = 7200\\text{ s}$ (2 horas).

### 2.2. Contracción del Volumen Plasmático
$$\\frac{d P_{\\text{plasma}}(t)}{dt} = \\frac{P_{\\text{target}}(g, \\text{hydration}) - P_{\\text{plasma}}(t)}{\\tau_{\\text{plasma}}}$$
* En microgravedad, el volumen plasmático se contrae entre un 10% y 14% en 48–72 horas como respuesta refleja central (Leach et al., 1996).

### 2.3. Dinámica de Gasto Cardíaco y Presión Arterial (Frank-Starling & Barorreflejo)
* Volumen Sistólico:
  $$SV(t) = SV_0 \\cdot \\left(1 + 0.18 \\cdot \\frac{V_{\\text{thoracic}}}{V_{\\text{max}}}\\right) \\cdot P_{\\text{plasma}}$$
* Gasto Cardíaco:
  $$CO(t) = \\frac{HR(t) \\cdot SV(t)}{1000}$$
* Presión Arterial Media (MAP):
  $$MAP(t) = CO(t) \\cdot TPR(t)$$
* Ajuste de Frecuencia Cardíaca por Barorreflejo:
  $$\\frac{d HR(t)}{dt} = \\frac{HR_0 + K_{\\text{baro}}(MAP_0 - MAP(t)) + \\Delta HR_{\\text{exercise}} - HR(t)}{\\tau_{\\text{baro}}}$$
* Presión Venosa Yugular Interna (JVP):
  $$JVP(t) = CVP(t) + 5.5 \\cdot (1 - g)$$
  *(Refleja la estasis y elevación de la presión venosa cefálica documentada por Marshall-Goebel et al. en la ISS).*

---

## 3. Sistema Neuro-Ocular y Presión Intracraneal (Riesgo SANS)
**Órganos:** Cerebro, Globos Oculares, Vaina del Nervio Óptico, Sistema Vestibular.

### 3.1. Presión Intracraneal (ICP)
En microgravedad, la pérdida del drenaje venoso dependiente de la gravedad mantiene la ICP en un nivel positivo continuo (~13–15 mmHg) las 24 horas del día (Lakin et al., 2007):
$$\\frac{d ICP(t)}{dt} = \\frac{ICP_{\\text{target}}(g, JVP, \\text{CO}_2) - ICP(t)}{\\tau_{\\text{icp}}}$$
La elevación del $\\text{CO}_2$ ambiental de la cabina incrementa la vasodilatación cerebral, elevando la ICP adicionalmente (Law et al., 2014):
$$ICP_{\\text{target}} = ICP_0 + 12(1 - g) + 1.5 \\cdot \\max\\left(0, \\frac{\\text{CO}_2 - 600}{1000}\\right) + 0.45(JVP - 3)$$

### 3.2. Diferencia de Presión Translaminar Cribosa (TLCPD)
$$\\Delta P_{\\text{tlcpd}}(t) = IOP(t) - ICP(t)$$
* En bipedestación terrestre: $IOP \\approx 15\\text{ mmHg}$, $ICP \\approx 1.5\\text{ mmHg} \\implies \\Delta P \\approx +13.5\\text{ mmHg}$.
* En microgravedad: $IOP \\approx 15\\text{ mmHg}$, $ICP \\approx 14\\text{ mmHg} \\implies \\Delta P \\approx +1.0\\text{ mmHg}$.
* Este colapso del gradiente genera deformación mecánica posterior y edema papilar (*Spaceflight-Associated Neuro-ocular Syndrome*, Stenger et al., 2017).

---

## 4. Sistema Respiratorio e Intercambio Gaseoso
**Órganos:** Pulmones y Capilares Alveolares.

### 4.1. Balance Alveolar de Dióxido de Carbono
$$\\frac{d P_A\\text{CO}_2(t)}{dt} = \\frac{\\dot{V}_{\\text{CO}_2} \\cdot (P_B - 47) / 1000 - \\dot{V}_A(t) \\cdot (P_A\\text{CO}_2(t) - P_I\\text{CO}_2)}{V_{\\text{alv}} \\cdot 60}$$
* $P_I\\text{CO}_2 = (\\text{CO}_2\\text{ [ppm]} / 10^6) \\cdot (P_B - 47)$.
* Ventilación Alveolar: $\\dot{V}_A(t) = RR(t) \\cdot (V_T(t) - V_D)$.

### 4.2. Ecuación del Gas Alveolar para Oxígeno ($P_A\\text{O}_2$)
$$P_A\\text{O}_2 = P_I\\text{O}_2 - \\frac{P_A\\text{CO}_2}{R}$$
* Saturación arterial $Sp\\text{O}_2$ calculada analíticamente mediante la función de disociación de Severinghaus (1979).

---

## 5. Sistema Renal y Regulación de Líquidos (Reflejo de Gauer-Henry)
**Órganos:** Riñones, Vejiga Urinaria.

### 5.1. Supresión Hormonal de ADH y Activación de ANP
La distensión auricular provocada por el desplazamiento torácico de fluidos inhibe la vasopresina (ADH) y estimula el péptido natriurético auricular (ANP), provocando diuresis temprana:
$$R_{\\text{reabsorption}}(t) = R_0 - 0.007 \\cdot ADH_{\\text{supp}} - 0.005 \\cdot ANP_{\\text{stim}}$$
$$\\dot{V}_{\\text{urine}}(t) = GFR \\cdot (1 - R_{\\text{reabsorption}}(t)) \\cdot 60\\text{ [mL/h]}$$

---

## 6. Termorregulación y Metabolismo Hepático ("Fiebre Espacial")
**Órganos:** Hígado, Núcleo Térmico Central.

### 6.1. Balance de Almacenamiento Térmico
$$C_{\\text{body}} \\frac{d T_{\\text{core}}(t)}{dt} = \\dot{M}_{\\text{metabolic}}(t) - h_{\\text{eff}} \\cdot (T_{\\text{core}}(t) - T_{\\text{ambient}})$$
* En microgravedad, la pérdida de convección natural del aire reduce el coeficiente de transferencia térmica $h_{\\text{eff}}$ en ~28%, provocando una elevación sostenida de la temperatura central de reposo (~+0.8 a +1.0 °C) según las mediciones en astronautas documentadas por Stahn et al. (2017).

---

## 7. Sistema Musculoesquelético (Mecanostato Óseo)
**Órganos:** Columna Vertebral, Huesos Largos, Músculos Posturales.

### 7.1. Tasa de Remodelado Óseo
$$\\frac{d BMD(t)}{dt} = -\\kappa_{\\text{resorption}} \\cdot \\max(0, 1 - \\text{Load}_{\\text{mech}}(t)) + \\kappa_{\\text{formation}} \\cdot \\text{Exercise}(t)$$
* Pérdida trabecular nominal en reposo espacial ~1.2% cada 30 días (Lang et al., 2004).
* El eflujo de calcio hacia el torrente circulatorio aumenta proporcionalmente a la resorción osteoclástica.
