/** The supplied artwork is the source of truth; CSS frames its mission patch. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand__patch" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}assets/lightminute-official.png`} alt="" width="724" height="511" />
      </span>
      <span className="brand__text">LIGHTMINUTE<span className="brand__sub">Earth-independent care</span></span>
    </div>
  );
}
