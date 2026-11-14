/* ES module entry point. The implementation lives in runner.js so that the
 * same code can also be loaded with a classic <script> from file://, where
 * browsers block ES module imports (origin "null"). */
import "./runner.js";

export const mountProtocolRunner = globalThis.TetherProtocolRunner.mountProtocolRunner;
export default mountProtocolRunner;
