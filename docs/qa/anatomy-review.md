# Revisión local de la anatomía

Se integró origin/main mediante avance directo hasta ce94890 antes de esta revisión.

- El enfoque desde el panel usa coordenadas mundiales del órgano. Esto incluye la escala del cuerpo y las transformaciones de los grupos anidados.
- El visor ampliado prioriza la geometría del órgano seleccionado en el cuerpo. Así conserva la distinción entre pulmón izquierdo y derecho y entre las referencias masculina y femenina.
- El centrado del visor ampliado aplica la misma escala al desplazamiento del centro.
- La cámara encuadra alrededor del punto de órbita y calcula la distancia según el campo de visión y el aspecto del contenedor.
- La referencia independiente del útero conserva su escala y se coloca tomando la vejiga como referencia pélvica. Su registro es aproximado. La posición añadida no constituye una segmentación del mismo donante ni una validación anatómica.
- La captura de referencia restablece la cámara después de las pruebas de zoom.

La geometría original de los demás órganos y sus relaciones espaciales proceden del archivo anatomy.bin y se conservan. Esta revisión corrige transformaciones de visualización. La correspondencia anatómica completa requiere revisión especializada.

Verificación local mediante npm run build y LIGHTMINUTE_SKIP_API=1 npm run test:e2e. Los registros están en anatomy-build.log y anatomy-browser.log. La compilación comprueba las ocho firmas de escenarios. Las capturas se generan en docs/screenshots.

La actualización requirió npm ci para instalar las dependencias incorporadas por el merge. Se detuvo el servidor Vite local para liberar los binarios de Rollup bloqueados por Windows.
