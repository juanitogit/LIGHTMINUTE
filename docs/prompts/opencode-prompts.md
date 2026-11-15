# Registro de Prompts de la Sesión — LIGHTMINUTE (OpenCode)

Este documento contiene **todos los prompts tal cual fueron escritos** durante esta sesión de trabajo en OpenCode, junto con el **modelo de Inteligencia Artificial** utilizado para procesar cada solicitud y la **fecha UTC** de cada interacción.

## Metadatos de la Sesión

- **Plataforma:** OpenCode
- **ID de Sesión:** `ses_e2358819cffedKue7CRmbpsoa9`
- **Modelo de IA empleado:** `opencode/deepseek-v4.1-flash-free`
- **Variante / esfuerzo:** `low`
- **Agente:** `build`
- **Modelo del producto (runtime):** `deepseek-flash` (API de DeepSeek; el motor decide, el LLM solo explica)
- **Total de Prompts / Interacciones:** 5

---

## Índice de Prompts

1. [Prompt #1 — Pruebas QA completas del proyecto](#prompt-1--pruebas-qa-completas-del-proyecto) — *"Vas a realizar lo siguiente, realizaras pruebas QA a todo este proyecto, neces..."*
2. [Prompt #2 — Reintento idéntico de las pruebas QA](#prompt-2--reintento-idéntico-de-las-pruebas-qa) — *"Vas a realizar lo siguiente, realizaras pruebas QA a todo este proyecto, neces..."*
3. [Prompt #3 — Documento de avances técnicos](#prompt-3--documento-de-avances-técnicos) — *"necesito que mires todo el proyecto y dentro de la carpeta docs cres un carpet..."*
4. [Prompt #4 — Corrección del reporte PDF de Personal Baseline](#prompt-4--corrección-del-reporte-pdf-de-personal-baseline) — *"En el apartado de Personal Baseline se creo un boton para generar reportes, pe..."*
5. [Prompt #5 — Registro de prompts de OpenCode](#prompt-5--registro-de-prompts-de-opencode) — *"quiero que dentro de la carpeta docs/promtps/ crees un archivo llamado opencod..."*

---

## Prompt 1 — Pruebas QA completas del proyecto

- **Fecha y Hora (UTC):** `2026-11-15T00:42:06Z`
- **Modelo de IA utilizado:** `opencode/deepseek-v4.1-flash-free` (variante `low`, agente `build`)
- **Nota:** primera emisión del prompt. El proveedor devolvió `provider.free-limit`, así que se reenvió sin cambios (ver Prompt 2).

### Contenido del Prompt:

```text
Vas a realizar lo siguiente, realizaras pruebas QA a todo este proyecto, necesito que dentro de la carpeta docs crees un carpeta de pruebas donde va ir un archivo md llamado "pruebas-qa.md" donde ira el reultado de las pruebas que vas a realizar, debe tener la fecha de la prueba, la localizacion de donde se estan haciendo las pruebas, como se estan haciendo, en donde se hacen, version, resultados de las pruebas, se explica lo que hace cada prueba en cada componente.  
```

---

## Prompt 2 — Reintento idéntico de las pruebas QA

- **Fecha y Hora (UTC):** `2026-11-15T00:43:16Z`
- **Modelo de IA utilizado:** `opencode/deepseek-v4.1-flash-free` (variante `low`, agente `build`)
- **Nota:** reintento idéntico del Prompt 1 tras el límite gratuito del proveedor. Texto sin cambios.

### Contenido del Prompt:

```text
Vas a realizar lo siguiente, realizaras pruebas QA a todo este proyecto, necesito que dentro de la carpeta docs crees un carpeta de pruebas donde va ir un archivo md llamado "pruebas-qa.md" donde ira el reultado de las pruebas que vas a realizar, debe tener la fecha de la prueba, la localizacion de donde se estan haciendo las pruebas, como se estan haciendo, en donde se hacen, version, resultados de las pruebas, se explica lo que hace cada prueba en cada componente.  
```

---

## Prompt 3 — Documento de avances técnicos

- **Fecha y Hora (UTC):** `2026-11-15T01:39:35Z`
- **Modelo de IA utilizado:** `opencode/deepseek-v4.1-flash-free` (variante `low`, agente `build`)

### Contenido del Prompt:

```text
necesito que mires todo el proyecto y dentro de la carpeta docs cres un carpeta llamada avances, donde crearas un archivo llamando "avances.md" donde debe estar las tecnologias usadas para el desarrollo de la aplicacion, que lenguejes de progamacion se estan usando y con que proposito y funcion, la arquitectura (en forma de diagrama) se esta trabajando el aplicativo, metodologia, requisitos funcionales y no funcioanles segun el aplicativo, como sirve el aplicativo. 
```

---

## Prompt 4 — Corrección del reporte PDF de Personal Baseline

- **Fecha y Hora (UTC):** `2026-11-15T02:51:08Z`
- **Modelo de IA utilizado:** `opencode/deepseek-v4.1-flash-free` (variante `low`, agente `build`)

### Contenido del Prompt:

```text
En el apartado de Personal Baseline se creo un boton para generar reportes, pero el pdf salio bastante simple, y muy desorganizado. No tiene forma profesioanl para reportes. Necesito que me ayudes a corriger eso siguiendo la logia del aplicativo que se esta trabajando y las reglas que estan establecidas. Al finalizar dame un reporte de los cambios. 
```

---

## Prompt 5 — Registro de prompts de OpenCode

- **Fecha y Hora (UTC):** `2026-11-15T14:22:17Z`
- **Modelo de IA utilizado:** `opencode/deepseek-v4.1-flash-free` (variante `low`, agente `build`)

### Contenido del Prompt:

```text
quiero que dentro de la carpeta docs/promtps/ crees un archivo llamado opencode-prompts.md donde coloques todos los prompts usados tal cual como estan junto al modelo usado y la fecha que se hicieron cada uno. 
```

---

## Nota de alcance

Este registro cubre exclusivamente las interacciones de esta sesión de OpenCode. Otros prompts del proyecto viven en sus propios archivos:

- Prompt de sistema del runtime (LLM del producto): `llm/prompts/decision_card.system.md`
- Prompts de los 7 agentes de trabajo: `agents/ALL_PROMPTS.md`
- Sesión de Antigravity: `docs/prompts/prompt-antygravity.md`
- Sesión de Freebuff: `docs/prompts/freebuff-prompts.md`

El texto de cada prompt se reproduce literal, incluidas las faltas de ortografía del original.
