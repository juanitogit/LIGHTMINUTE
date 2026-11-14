export function CrewPills({
  crewIds,
  crew,
  onCrew,
  label = "Crew member",
}: {
  crewIds: string[];
  crew: string;
  onCrew: (id: string) => void;
  label?: string;
}) {
  return (
    <div className="crew-pills" role="group" aria-label={label}>
      {crewIds.map((id) => (
        <button
          key={id}
          type="button"
          className={`crew-pill ${crew === id ? "is-active" : ""}`}
          aria-pressed={crew === id}
          onClick={() => onCrew(id)}
        >
          {id}
        </button>
      ))}
    </div>
  );
}
