# Escaneo de secretos del historial

Revisión del 15 de noviembre de 2026 sobre `dbc2070` y las referencias y reflogs
disponibles localmente: `git rev-list --all --reflog --count` identificó 113
commits. Se ejecutó `gitleaks git --log-opts='--all --reflog' --redact=100`
con reglas predeterminadas y reglas adicionales para claves OAuth con prefijo
Google y DSN PostgreSQL con contraseña en dominios Neon. El informe se guardó
fuera del repositorio y con valores redactados.

Resultado: una alerta genérica en `docs/autonomy/PREREG-fault-injection.md`,
commit `2fea48ff`, línea 13. La revisión de contexto mostró que es una frase
normal de documentación sobre fallo de API; es un falso positivo. No hubo
hallazgos de las reglas adicionales Google o Neon ni se encontró una credencial
real entre las alertas. Por tanto, no se ejecutó ninguna rotación automática.

Esto no demuestra ausencia absoluta de secretos: el escáner depende de patrones,
su configuración y del historial accesible; objetos inalcanzables sin reflog,
archivos binarios/archivos comprimidos y otros servicios o clones pueden quedar
fuera. El repositorio permanece privado. No se han inspeccionado ni alterado los
secretos actualmente guardados en cuentas externas.
