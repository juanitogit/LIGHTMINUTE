/** HyperFrames source for the pre-rendered startup composition. */
(() => {
  type Timeline = {
    to(target: unknown, vars: Record<string,unknown>, at: number): Timeline;
    fromTo(target: unknown, from: Record<string,unknown>, to: Record<string,unknown>, at: number): Timeline;
  };
  const host = window as unknown as Window & {gsap:{timeline:(options:{paused:boolean})=>Timeline};__timelines:Record<string,Timeline>};
  const timeline = host.gsap.timeline({paused:true});
  timeline.to("#orbit",{strokeDashoffset:0,duration:1.05,ease:"power2.out"},0.05)
    .fromTo("#spark",{opacity:0,scale:.65,transformOrigin:"center"},{opacity:1,scale:1,duration:.35,ease:"power2.out"},.2)
    .to(["#orbit","#spark"],{opacity:0,duration:.35,ease:"power1.inOut"},1.1)
    .to({}, {duration:.05},1.45);
  host.__timelines["lightminute-start"] = timeline;
})();
