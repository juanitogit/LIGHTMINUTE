# HUD-Visor

Prototipos estáticos del visor de casco de LIGHTMINUTE. No forman parte del build de
`apps/crew-tablet`; se abren directamente en el navegador.

| Archivo | Qué es |
|---|---|
| `lightminute-visor-hud.html` | HUD de casco (telemetría, alertas, retícula) sobre un fondo lunar |
| `moon-environment.html` | Entorno lunar animado que el HUD carga en un `iframe` |

## Cómo verlo

```powershell
# desde la raíz del repo
start HUD-Visor\lightminute-visor-hud.html
```

El HUD referencia `moon-environment.html` de forma relativa, así que ambos archivos deben
mantenerse en la misma carpeta. Para servirlo por HTTP:

```powershell
python -m http.server 8080 --directory HUD-Visor
# http://localhost:8080/lightminute-visor-hud.html
```

> Datos sintéticos. No es un dispositivo médico.
