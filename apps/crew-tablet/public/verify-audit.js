/* Generated from apps/crew-tablet/src/verifyAuditPage.ts; edit the TypeScript source. */
(function () {
/** Standalone verifier; no signing key or network is required. */
(() => {
    const file = document.getElementById("file");
    const expected = document.getElementById("fingerprint");
    const result = document.getElementById("result");
    const button = document.getElementById("verify");
    const bytes = (value) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
    button.addEventListener("click", async () => {
        try {
            const selected = file.files?.[0];
            if (!selected)
                throw Error("Choose a signed JSON file.");
            if (selected.size > 15000000)
                throw Error("File is too large.");
            const envelope = JSON.parse(await selected.text());
            if (envelope.algorithm !== "Ed25519")
                throw Error("Unsupported signature algorithm.");
            const publicKey = bytes(envelope.publicKey);
            const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", publicKey)), value => value.toString(16).padStart(2, "0")).join("");
            const pin = expected.value.trim().toLowerCase().replaceAll(":", "");
            if (pin && pin !== fingerprint)
                throw Error("The public-key fingerprint does not match.");
            const key = await crypto.subtle.importKey("spki", publicKey, { name: "Ed25519" }, false, ["verify"]);
            const ok = await crypto.subtle.verify("Ed25519", key, bytes(envelope.signature), bytes(envelope.payload));
            result.textContent = ok ? `Signature valid.\nPublic-key SHA-256: ${fingerprint}\n${pin ? "Fingerprint matches." : "Signer identity is not verified until you compare the fingerprint independently."}` : "Signature invalid.";
        }
        catch (error) {
            result.textContent = `Verification failed: ${error instanceof Error ? error.message : String(error)}`;
        }
    });
})();
})();
