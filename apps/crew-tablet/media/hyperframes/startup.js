/* Generated from apps/crew-tablet/media/hyperframes/startup.ts; edit the TypeScript source. */
(function () {
/** HyperFrames source for the pre-rendered startup composition. */
(() => {
    const host = window;
    const timeline = host.gsap.timeline({ paused: true });
    timeline.to("#orbit", { strokeDashoffset: 0, duration: 1.05, ease: "power2.out" }, 0.05)
        .fromTo("#spark", { opacity: 0, scale: .65, transformOrigin: "center" }, { opacity: 1, scale: 1, duration: .35, ease: "power2.out" }, .2)
        .to(["#orbit", "#spark"], { opacity: 0, duration: .35, ease: "power1.inOut" }, 1.1)
        .to({}, { duration: .05 }, 1.45);
    host.__timelines["lightminute-start"] = timeline;
})();
})();
