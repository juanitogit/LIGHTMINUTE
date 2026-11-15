# LIGHTMINUTE startup motion

`startup.html` is the editable HyperFrames composition. The transparent 1.5 s
WebM in `public/assets/motion/startup.webm` was rendered with HyperFrames 0.9.52
at 30 fps; it contains no audio and is decorative. The app disables it when the
browser requests reduced motion and never waits for video playback to accept input.

To rebuild, place `startup.html` as `index.html` in a temporary directory with
`gsap.min.js` from the GSAP npm package alongside it, then run
`npx hyperframes lint <directory>` and
`npx hyperframes render <directory> --format webm --fps 30 --quality draft --output startup.webm`.
