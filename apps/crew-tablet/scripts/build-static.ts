import {readFileSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import ts from "typescript";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");
const sources = [
  {source:"apps/ground-console/src/audit-core.ts", output:"apps/ground-console/src/audit-core.js", classic:true},
  {source:"apps/ground-console/src/audit.ts", output:"apps/ground-console/src/audit.js", classic:false},
  {source:"apps/ground-console/src/audit.test.ts", output:"apps/ground-console/src/audit.test.mjs", classic:false},
  {source:"apps/ground-console/src/main.ts", output:"apps/ground-console/src/main.js", classic:true},
  {source:"packages/protocol-runner/runner.ts", output:"packages/protocol-runner/runner.js", classic:true},
  {source:"packages/protocol-runner/index.ts", output:"packages/protocol-runner/index.js", classic:false},
  {source:"packages/protocol-runner/demo.ts", output:"packages/protocol-runner/demo.js", classic:true},
  {source:"apps/crew-tablet/scripts/check-signatures.ts", output:"apps/crew-tablet/scripts/check-signatures.mjs", classic:false},
  {source:"apps/crew-tablet/scripts/sign-audit.ts", output:"apps/crew-tablet/scripts/sign-audit.mjs", classic:false},
  {source:"apps/crew-tablet/scripts/sign-scenarios.ts", output:"apps/crew-tablet/scripts/sign-scenarios.mjs", classic:false},
  {source:"apps/crew-tablet/scripts/smoke.ts", output:"apps/crew-tablet/scripts/smoke.mjs", classic:false},
  {source:"apps/crew-tablet/tests/e2e.ts", output:"apps/crew-tablet/tests/e2e.mjs", classic:false},
  {source:"tests/fault_injection/browser.ts", output:"tests/fault_injection/browser.mjs", classic:false},
  {source:"apps/crew-tablet/src/verifyAuditPage.ts", output:"apps/crew-tablet/public/verify-audit.js", classic:true},
  {source:"apps/crew-tablet/media/hyperframes/startup.ts", output:"apps/crew-tablet/media/hyperframes/startup.js", classic:true},
];
const check = process.argv.includes("--check");
for (const {source, output, classic} of sources) {
  const sourceText = readFileSync(resolve(root, source), "utf8");
  // Type-only imports are checked separately; removing them here prevents the
  // classic-script output from acquiring CommonJS exports.
  const transpileSource = classic ? sourceText.replace(/^import type .*;\r?\n/gm, "") : sourceText;
  const js = ts.transpileModule(transpileSource, {compilerOptions:{
    target:ts.ScriptTarget.ES2022,
    module:classic ? ts.ModuleKind.None : ts.ModuleKind.ESNext,
    removeComments:false,
  }}).outputText.replace(/\r\n/g,"\n");
  const shebang = js.match(/^#![^\n]*\n/)?.[0] ?? "";
  const body = shebang ? js.slice(shebang.length) : js;
  const generated = shebang + `/* Generated from ${source}; edit the TypeScript source. */\n` + (classic ? `(function () {\n${body}})();\n` : body);
  const outputPath = resolve(root, output);
  if (check) {
    if (readFileSync(outputPath,"utf8").replace(/\r\n/g,"\n") !== generated) throw new Error(`${output} is out of date; run npm run build:static`);
  } else writeFileSync(outputPath, generated, "utf8");
  console.log(`${check ? "Verified" : "Generated"} ${output}`);
}
