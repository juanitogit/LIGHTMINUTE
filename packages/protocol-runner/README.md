# protocol-runner

Framework-free, timed protocol walkthrough for TETHER. One step per screen, >=64px
targets, keyboard + screen reader, per-step timer, "can't do this" branch, undo, and
a visible `demo-wording` badge on every step that has no published source.

Data shape (from `kb/protocols/<id>.json`):

```json
{ "id": "...", "title": "...", "trigger_patterns": ["..."],
  "steps": [{ "text": "...", "source_status": "published|demo-wording", "source": "..." }] }
```

## Usage (10 lines)

```html
<link rel="stylesheet" href="packages/protocol-runner/style.css" />
<script type="module">
  import { mountProtocolRunner } from "./packages/protocol-runner/index.js";
  // classic script instead? <script src="packages/protocol-runner/runner.js"></script>
  const runner = mountProtocolRunner(document.querySelector("#protocol"), {
    protocolId: "fever_like_syndrome",           // fetched from ../../kb/protocols/<id>.json
    onStep: (e) => audit.append("protocol_step", e),  // {protocolId, stepIndex, status, tsMs}
    onDone: (e) => console.log(e.completed, e.totalMs),
  });
</script>
```

## API

`mountProtocolRunner(el, opts) -> controller`

| opt | type | notes |
|---|---|---|
| `protocolId` | string | id under `kb/protocols/`; used when `protocol` is absent |
| `protocol` | object | inline protocol (needed for `file://`, where `fetch` is blocked) |
| `protocolUrl` | string | override the default `../../kb/protocols/<id>.json` |
| `onStep` | `(payload) => void` | `{protocolId, stepIndex, status, tsMs}` — `status`: `viewed` \| `done` \| `cannot` \| `undo` |
| `onDone` | `(summary) => void` | `{protocolId, completed, startedMs, endedMs, totalMs, steps:[{stepIndex,status,reason,ms}]}` |

Controller: `destroy()`, `next()`, `prev()`, `undo()`, `cannot()`, `restart()`,
`setProtocol(obj)`, `getState()`.

Keyboard inside the runner: `→`/`Enter` = done, `←` = undo, `C` = can't do this.

## Behaviour

- Every `onStep` call is a single audit-ready record; the host appends it to the
  hash-chained log (`apps/ground-console/src/audit.js` mirrors `tether_engine/audit.py`).
- "Can't do this" offers three branches: skip, call a crew mate, or stop and escalate.
  Escalating ends the run with `completed: false`, so the card's `ground_message` goes first.
- Steps never contain drug doses; they point at the onboard medical protocol.
- Any crew member can run it (the patient may be the CMO).

## Two entry points, one implementation

| file | how it loads | why |
|---|---|---|
| `index.js` | ES module | the documented interface; import from bundlers or `<script type="module">` over http |
| `runner.js` | classic script | `file://` blocks ES module imports (origin `null`), so `demo.html` uses this |

Both expose the same `mountProtocolRunner(el, opts)`.

## demo.html

Open it directly from disk: `packages/protocol-runner/demo.html`. It inlines a copy of
`kb/protocols/fever_like_syndrome.json` because `file://` cannot `fetch()` local JSON;
over http the runner fetches the real file instead. Copy the JSON again if the protocol
changes.

## Tests

No build step and no dependencies. `node --check index.js` plus the ground-console
audit test cover the JS that has logic in it.
