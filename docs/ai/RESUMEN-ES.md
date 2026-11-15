# Resumen en español — uso de IA en LIGHTMINUTE

Documentación completa en inglés: `INVENTORY.md`, `SLM-TRAINING-RECORD.md`,
`MODEL-CARD.md`, `DATASET-CARD.md`, `OPEN-QUESTIONS.md`.

**1. IA para construir el proyecto.** Se usaron asistentes de código: OpenCode
(`opencode/deepseek-v4.1-flash-free`), Freebuff (`DeepSeek V4.1 Flash Slow`) y
Antigravity (`Gemini 3.8 Flash (Medium)`, `Claude Sonnet 4.6 (Thinking)`), según
los registros en `docs/prompts/`. 27 commits llevan la línea
`Co-Authored-By: Codebuff`. El equipo revisa y asume cada cambio.

**2. IA dentro del producto.** El motor determinista calcula todos los números y
el nivel de urgencia. Un modelo opcional (`deepseek-flash` vía API de DeepSeek)
solo redacta la Decision Card; un verificador determinista rechaza citas
inventadas, números alterados, urgencia rebajada, diagnósticos y dosis, y existe
un respaldo de plantilla. El producto funciona sin LLM (`LLM_PROVIDER=none`). En
el repositorio **no hay evidencia de una llamada real** al modelo en el producto;
la auditoría registra que no había clave y que no se ejecutó. El dictado por voz
usa la Web Speech API del navegador, que puede enviar audio a su proveedor; la
interfaz lo advierte.

**3. Modelo entrenado (SLM).** Adaptador LoRA sobre `Qwen/Qwen2.5-0.5B-Instruct`
(Apache-2.0), 2.125 filas de entrenamiento, 133 pasos, 1 época, semilla 42,
RTX 3050 Laptop. Resultado: 57,1% en test (n=224) y 49,1% en OOD (n=289) tras un
reintento; 0% de tarjetas completas al primer intento con el límite de 320
tokens. **No está integrado en el producto y no superó sus puertas:** G1
(4.000 filas) y G3 (revisión humana) no se cumplen. No es un dispositivo médico.

**4. Contenido generado por IA.** El pitch es solo texto; las capturas son del
E2E; el logo es del equipo; los modelos anatómicos son CC BY / CC0 (NIH 3D,
BodyParts3D, HRA) y están acreditados. Ningún archivo describe un recurso como
generado por IA y no aparece ningún texto de marca de agua de IA, pero **no se
hizo una inspección visual** de las imágenes y el vídeo (Q13 en
`OPEN-QUESTIONS.md`).

**5. Estadística, no aprendizaje automático.** El baseline N-of-1 bayesiano
(Normal-Inverse-Gamma, predictivo Student-t) y el experimento conformal son
métodos estadísticos clásicos, separados del producto en el caso conformal. No
son LLM ni entrenamiento de modelos.

**6. Datos sintéticos.** Los escenarios se generan con un simulador determinista
con semilla; las etiquetas van en un archivo aparte que el motor nunca lee. Los
"teachers" del SLM son varios modelos gratuitos rotados por cuota a través de la
CLI de OpenCode (7 en las tarjetas de entrenamiento; el mayor,
`inkling-2-small:free`, con 672 de 2.141 filas; DeepSeek V4.1 Flash solo 503),
fuera del producto.

**Limitaciones principales:** la capa LLM es opcional y no está verificada en
operación real; el SLM es un resultado de viabilidad parcial, no una función
entregada; ninguna parte es dispositivo médico ni da diagnóstico. Las dudas
pendientes están en `OPEN-QUESTIONS.md`.
