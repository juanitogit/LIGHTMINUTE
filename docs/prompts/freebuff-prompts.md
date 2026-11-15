# Registro de Prompts de la Sesión — LIGHTMINUTE (Freebuff)

Este documento contiene **todos los prompts tal cual fueron escritos** durante esta sesión de trabajo en Freebuff, junto con el **modelo de Inteligencia Artificial** utilizado para procesar cada solicitud y el **propósito** de cada uno.

## Metadatos de la Sesión
- **Plataforma:** Freebuff
- **Modelo de IA empleado:** `DeepSeek V4.1 Flash Slow`
- **Modelo del producto (runtime):** `deepseek-flash` (API de DeepSeek; el motor decide, el LLM solo explica)
- **Fecha:** 2026-11-15
- **Total de Prompts / Interacciones:** 6
- **Commit base de la sesión:** `3c682aebb41e1593d6f1fa030852aaac06e74d4f` (`main`)

---

## Índice de Prompts

1. [Prompt #1 — Análisis de la bóveda e ideas de proyecto](#prompt-1--análisis-de-la-bóveda-e-ideas-de-proyecto) — *Definir el rumbo del proyecto a partir de la bóveda*
2. [Prompt #2 — Registro de prompts de Freebuff](#prompt-2--registro-de-prompts-de-freebuff) — *Dejar traza de los prompts y del modelo usado*
3. [Prompt #3 — Campaña de pruebas QA del proyecto](#prompt-3--campaña-de-pruebas-qa-del-proyecto) — *Comprobar que todo funciona, sin tocar código*
4. [Prompt #4 — Requisitos del documento de resultados QA](#prompt-4--requisitos-del-documento-de-resultados-qa) — *Fijar el contenido y el control de versiones del reporte*
5. [Prompt #5 — Restricciones de entrega de la campaña QA](#prompt-5--restricciones-de-entrega-de-la-campaña-qa) — *Mantener la autoría del commit y el árbol intacto*
6. [Prompt #6 — Propósitos y nuevos prompts en este registro](#prompt-6--propósitos-y-nuevos-prompts-en-este-registro) — *Documentar el porqué de cada prompt y sumar los de esta sesión*

---

## Prompt 1 — Análisis de la bóveda e ideas de proyecto
- **Modelo de IA utilizado:** `DeepSeek V4.1 Flash Slow`
- **Propósito:** Convertir el conocimiento acumulado en la bóveda de Obsidian (`/vault`) en insumo real de decisión: entender el contexto, los datos y las restricciones del proyecto antes de escribir nada, y proponer líneas de trabajo viables para LIGHTMINUTE. Busca que la idea del producto nazca del material ya investigado y no de una ocurrencia suelta.
- **Uso del resultado:** base para el alcance del MVP, los diferenciadores y la narrativa de la propuesta.

### Contenido del Prompt:
```text
Mira la carpeta /vault, analiza su contenido entero, pues hay informacion importante a tener en cuenta, necesito que me digas con esa informacion que ideas puedo desarrollar para la creacion del proyecto. Ademas, debes tener en cuenta ese contenido.
```

---

## Prompt 2 — Registro de prompts de Freebuff
- **Modelo de IA utilizado:** `DeepSeek V4.1 Flash Slow`
- **Propósito:** Crear trazabilidad de la sesión: conservar cada instrucción tal como se escribió, junto al modelo que la procesó, para poder auditar después qué se pidió, con qué herramienta y en qué orden. Es un requisito de honestidad y reproducibilidad del proyecto, no una funcionalidad del producto.
- **Uso del resultado:** origen de este archivo; se amplía en el Prompt 6.

### Contenido del Prompt:
```text
Quiero que dentro de la carpeta de docs/prompts/ crees un archivo llamado freebuff-prompts.md de todo los promps usandos junto al modelo de IA usado para trabajarlos, los prompts deben ser tal cuales estan escritos.
```

---

## Prompt 3 — Campaña de pruebas QA del proyecto
- **Modelo de IA utilizado:** `DeepSeek V4.1 Flash Slow`
- **Propósito:** Verificar de forma integral —no superficial— que el proyecto funciona: motor determinista, simuladores, API, datos y estadísticas, con la condición explícita de **no modificar el código**. La intención es obtener un diagnóstico honesto del estado real del repositorio antes de la entrega, ejecutando las pruebas como las define el propio aplicativo y no inventando atajos.
- **Uso del resultado:** insumo de la Campaña 2 en `docs/pruebas/pruebas-qa.md`.

### Contenido del Prompt:
```text
Quiero que realices pruebas qr a todo el proyecto para saber si funciona de forma optima, probar todo, los simuladores, las apis (si hay), los datos, las estadisticas, todo pero no vas realizar modificaciones solo las pruebas.
```

---

## Prompt 4 — Requisitos del documento de resultados QA
- **Modelo de IA utilizado:** `DeepSeek V4.1 Flash Slow`
- **Propósito:** Definir el contrato del entregable de la campaña: dónde vive, qué debe contener (fecha, autoría del modelo de IA, pruebas realizadas, componentes afectados) y que incluya **control de versiones**. Persigue que el reporte sea auditable y comparable con campañas anteriores, no un resumen informal en el chat.
- **Uso del resultado:** estructura C2-1 a C2-10 del documento QA (v1.1).

### Contenido del Prompt:
```text
Dentro de la carpeta docs/pruebas/ denntro del archivo pruebas-qa.md vas a poner los resultados de esas pruebas con fecha de realizacion, quien la hizo (modelo de IA), que pruebas hizo, en que compoenentes, agrega un control de versiones.
```

---

## Prompt 5 — Restricciones de entrega de la campaña QA
- **Modelo de IA utilizado:** `DeepSeek V4.1 Flash Slow`
- **Propósito:** Reservar la autoría del historial de git para la persona y evitar que la campaña de pruebas altere el producto que se está evaluando. Fija dos límites: nada de `push`/`commit`/`merge`, y nada de cambios de código; las pruebas se ejecutan sobre el repositorio tal cual.
- **Uso del resultado:** árbol limpio al cerrar (salvo el documento QA) y evidencia de solo lectura.

### Contenido del Prompt:
```text
No vas a realizar push, commit, o merge, eso lo hago yo. Y no vas a modificar el codigo, vas a realizar las pruebas tal cual la pide el contexto del aplicativo.
```

---

## Prompt 6 — Propósitos y nuevos prompts en este registro
- **Modelo de IA utilizado:** `DeepSeek V4.1 Flash Slow`
- **Propósito:** Completar el registro de la sesión con dos cosas: explicar **para qué sirve** cada prompt (no solo qué decía) y sumar las interacciones que faltaban, incluida esta misma. La intención es que el archivo pase de ser una transcripción a ser un registro útil para entender las decisiones y el método de trabajo.
- **Uso del resultado:** versión actual de este documento (6 prompts, propósito por interacción).

### Contenido del Prompt:
```text
vas a ir a la carpeta de docs/prompts y cambiar el archivo que se esta dentro llamado freebuff-prompts.md, necesito que modifiques el proposito de cada prompt, y agrege los prompts nuevos de esta sesion a ese md respectivo.
```

---

## Nota de alcance

Este registro cubre exclusivamente las interacciones de esta sesión de Freebuff. Hay trabajo previo hecho con Freebuff (ver `handoff/freebuff-checklist.md` y `docs/safety/freebuff-review/`), pero sus transcripciones no están en el repositorio, así que sus prompts no se pudieron transcribir aquí. Otros prompts del proyecto no forman parte de esta sesión y viven en sus propios archivos:

- Prompt de sistema del runtime (LLM del producto): `llm/prompts/decision_card.system.md`
- Prompts de los 7 agentes de trabajo: `agents/ALL_PROMPTS.md`
- Sesión de Antigravity: `docs/prompts/prompt-antygravity.md`
- Sesión de OpenCode: `docs/prompts/opencode-prompts.md`

Los prompts #1 y #2 conservan su texto original; los #3 a #6 corresponden a esta sesión y se reproducen literales, incluidas las faltas de ortografía del original (por ejemplo, “qr” por “QA”, “denntro”, “compoenentes”).
