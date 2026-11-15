import { AttributionBanner, CrewStrip } from "../components/CrewStrip";
import { BodyModel3D } from "../components/BodyModel3D";
import { Icon } from "../components/Icon";
import { LevelBadge, Panel } from "../components/primitives";
import { SyndromeStrip } from "../components/SyndromeStrip";
import { AnimatedPolyline } from "../components/AnimatedPolyline";
import { CaseHistoryBanner } from "../components/CaseHistoryBanner";
import { fmt, fmtDelay, unitLabel } from "../lib/format";
import { crewRoles, indicatorMeta, PERSONAL_LABEL } from "../lib/meta";
import { nasaCaseForDoc } from "../lib/nasaCases";
import type { LoadedScenario } from "../lib/types";

export function Glance({ scenario, dayNumber, crewId, onCrew, onOpenWhy, onOpenAct, onOpenIndicator, onOpenDetection }: {
  scenario: LoadedScenario;
  dayNumber: number;
  crewId: string;
  onCrew: (id: string) => void;
  onOpenWhy: () => void;
  onOpenAct: () => void;
  onOpenIndicator: (key: string) => void;
  onOpenDetection: (day: number, crew: string) => void;
}) {
  const day = scenario.doc.days.find((d) => d.day === dayNumber);
  const member = day?.crew?.[crewId];
  const members = Object.values(day?.crew ?? {});
  const roles = crewRoles(scenario.doc);
  const caseMeta = nasaCaseForDoc(scenario.doc);
  const attention = members.filter((m) => m.level === "act" || m.level === "escalate").length;
  const history = scenario.doc.days.filter((d) => d.day <= dayNumber).slice(-14);
  const series = history.flatMap((d) => {
    const z = d.crew[crewId]?.syndrome_z;
    return typeof z === "number" && Number.isFinite(z) ? [{ day: d.day, z }] : [];
  });

  return <div className="view glance">
    <header className="viewhead overview-heading">
      <div><p className="micro">LIGHTMINUTE / CREW WORKSPACE</p><h1>Crew health</h1><p className="viewhead__sub">Your own baseline. A clearer picture.</p></div>
      <div className="overview-day"><span>Mission day</span><strong>{String(dayNumber).padStart(2,"0")}</strong><span>of {scenario.doc.days.length}</span></div>
    </header>
    <div className="overview-context"><span>{members.length} crew members</span><span className={attention ? "context-attention" : ""}>{attention ? `${attention} requiring action` : "No action-level findings"}</span><span>Earth round trip {fmtDelay(member?.routing.expected_reply_s)}</span></div>
    {caseMeta ? <CaseHistoryBanner meta={caseMeta} doc={scenario.doc} onDetect={onOpenDetection} /> : null}
    <section className="crew-section" aria-label="Select a crew member">
      {day ? <CrewStrip crew={day.crew} roles={roles} selected={crewId} onOpen={onCrew} /> : null}
    </section>
    {member ? <>
      <div className="glance__grid">
        <section className="body-column" aria-labelledby="body-title">
          <header className="body-heading"><div><p className="micro">PERSONAL VIEW</p><h2 id="body-title">Crew {crewId} <span>{roles[crewId]}</span></h2></div><LevelBadge level={member.level} /></header>
          <BodyModel3D
            readings={member.indicators}
            crewLabel={`Crew ${crewId}`}
            onOpenIndicator={onOpenIndicator}
            missionDay={dayNumber}
          />
          <p className="body-context"><span className="landmark-key" />Landmarks reflect the personal lens.<br />{member.learning ? "Your baseline is still learning." : "Compared with your own 95% personal band."}</p>
        </section>
        <div className="glance__side">
          <section className="signals-section" aria-labelledby="signals-title">
            <header className="panel__head"><h2 id="signals-title">Today's signals</h2><span className="small muted">Last {history.length} days</span></header>
            <div className="signal-list">
              {(scenario.doc.indicators ?? Object.keys(member.indicators)).map((key) => {
                const reading = member.indicators[key], meta = indicatorMeta(key);
                const values = history.map((d) => d.crew[crewId]?.indicators[key]?.value);
                const finite = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
                const lo = Math.min(...finite), hi = Math.max(...finite);
                const segments = values.map((v,i)=>typeof v === "number" && Number.isFinite(v) ? `${5+i*90/Math.max(1,values.length-1)},${32-(v-lo)/(hi-lo||1)*23}` : null)
                  .reduce<string[]>((all,p)=>{if(p===null)all.push("");else all[all.length-1]+=`${p} `;return all;},[""]);
                const verdict=reading?.lens.personal, unusual=verdict==="unusual_high"||verdict==="unusual_low"||verdict==="watch";
                return <button type="button" key={key} className={`signal-row ${unusual?"is-unusual":""}`} onClick={()=>onOpenIndicator(key)} aria-label={`${meta.label}: ${reading?fmt(reading.value,meta.decimals):"no reading"}. Open personal baseline`}>
                  <span className="signal-row__name"><strong>{meta.label}</strong><small>{PERSONAL_LABEL[verdict??""]??"No reading today"}</small></span>
                  <span className="signal-row__value"><span className="metric-change" key={`${crewId}-${dayNumber}-${key}`}>{reading?fmt(reading.value,meta.decimals):"—"}</span><small>{unitLabel(reading?.unit??meta.unit)}</small></span>
                  <svg className="signal-spark" viewBox="0 0 100 40" aria-hidden="true">{segments.filter(Boolean).map((s,i)=><AnimatedPolyline key={i} className="chart-continuous" points={s}/>)}{finite.length===1?<circle cx="5" cy="32" r="2"/>:null}</svg>
                  <Icon name="chevron" size={13} className="disclosure-arrow" />
                </button>;
              })}
            </div>
          </section>
          <section className="trend-panel" aria-labelledby="combined-title"><header className="panel__head"><h2 id="combined-title">Signals, together</h2><span className="trend-score">z {fmt(member.syndrome_z,2)}</span></header><SyndromeStrip series={series} selectedDay={dayNumber}/></section>
          <button type="button" className="text-action" onClick={onOpenWhy}>Explore personal baseline <Icon name="arrow" size={15}/></button>
        </div>
      </div>
      <AttributionBanner attribution={day?.attribution}/>
      <section className="overview-decision" aria-labelledby="next-title"><div><p className="micro">NEXT STEPS / CREW {crewId}</p><h2 id="next-title">{member.card.headline}</h2><p>{member.card.do_now[0]}</p></div><button type="button" className="text-action" onClick={onOpenAct}>Review actions <Icon name="arrow" size={16}/></button></section>
    </> : <Panel><p>No crew readings for this day.</p></Panel>}
    <p className="glance__footnote">Synthetic mission data. Decision support for demonstration. Not a medical device.</p>
  </div>;
}
