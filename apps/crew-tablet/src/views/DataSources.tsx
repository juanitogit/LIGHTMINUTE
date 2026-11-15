/** Provenance describes existing research and snapshots, not the synthetic crew. */
export function DataSources() {
  return <div className="view data-sources">
    <header className="viewhead"><div><p className="micro">PROVENANCE &amp; LIMITATIONS</p><h1>Data sources</h1><p className="viewhead__sub">Research evidence and historical context are separate from the synthetic crew.</p></div></header>
    <section aria-labelledby="osdr-source">
      <h2 id="osdr-source">NASA OSDR · OSD-575</h2>
      <p><a href="https://osdr.nasa.gov/bio/repo/data/studies/OSD-575" target="_blank" rel="noreferrer noopener">SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex)</a></p>
      <dl>
        <dt>Label</dt><dd>Real-public research data, not the synthetic crew.</dd>
        <dt>Use</dt><dd>Exploratory postflight comparisons using the public transformed comprehensive metabolic panel. Not used as live crew telemetry.</dd>
        <dt>Limitations</dt><dd>Four private astronauts; sparse preflight observations; exploratory and not clinical validation. Directional concordance was not assessed.</dd>
        <dt>Retrieved</dt><dd>2026-11-14 20:45 UTC, according to the project's provenance manifest.</dd>
        <dt>Source file SHA-256</dt><dd><code style={{overflowWrap: "anywhere"}}>5eb1e7f025dd8443a9e70111e62bc32afae3432753024489c5c013e401d709d9</code></dd>
      </dl>
      <p>Data are courtesy of the NASA Open Science Data Repository (<a href="https://osdr.nasa.gov/bio/repo" target="_blank" rel="noreferrer noopener">https://osdr.nasa.gov/bio/repo</a>).</p>
    </section>
    <section aria-labelledby="weather-source">
      <h2 id="weather-source">Historical space weather</h2>
      <p><a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noreferrer noopener">NASA DONKI</a> events and <a href="https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json" target="_blank" rel="noreferrer noopener">NOAA GOES</a> proton flux are separate build-time snapshots shown in Space weather. The events and flux are environmental context, not an individual radiation dose.</p>
    </section>
    <section aria-labelledby="access-limits">
      <h2 id="access-limits">Access and privacy</h2>
      <p>NASA LSAH astronaut medical records and applicable LSDA research records require a data request; no LSAH or restricted LSDA records were used. OSD-575 is a separate public biomedical research dataset. LIGHTMINUTE uses no real personal health data in crew scenarios.</p>
      <p><a href="https://science.nasa.gov/reference/osdr-faq/" target="_blank" rel="noreferrer noopener">NASA OSDR citation guidance</a> · <a href="https://lsda.jsc.nasa.gov/Request/data" target="_blank" rel="noreferrer noopener">NASA data request information</a></p>
    </section>
  </div>;
}
