import { formatValue, primitiveEntries } from "../lib/inspect";
import { humanise } from "../lib/format";

export function Tiles({
  entries,
  columns = 3,
}: {
  entries: [string, string][];
  columns?: number;
}) {
  if (entries.length === 0) return null;
  return (
    <dl className={`tiles tiles--${columns}`}>
      {entries.map(([key, value]) => (
        <div key={key} className="tile">
          <dt>{humanise(key)}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DataTable({
  rows,
  caption,
  maxRows = 20,
}: {
  rows: Record<string, unknown>[];
  caption?: string;
  maxRows?: number;
}) {
  if (rows.length === 0) return null;
  const columns = Array.from(
    new Set(rows.slice(0, 5).flatMap((row) => Object.keys(row))),
  ).slice(0, 6);

  return (
    <div className="table-wrap">
      <table className="data-table">
        {caption ? <caption>{humanise(caption)}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {humanise(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, maxRows).map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column}>{formatValue(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows ? (
        <p className="muted small">
          Showing {maxRows} of {rows.length} rows — full data in the source file.
        </p>
      ) : null}
    </div>
  );
}

export function Bullets({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "warn" }) {
  if (items.length === 0) return null;
  return (
    <ul className={`plain-list ${tone === "warn" ? "plain-list--warn" : ""}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function RawDetails({ data }: { data: unknown }) {
  const entries = primitiveEntries(
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {},
  );
  if (entries.length === 0) return null;
  return (
    <details className="raw">
      <summary>Raw fields</summary>
      <dl className="raw__list">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
