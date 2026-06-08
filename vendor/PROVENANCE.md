# Vendored dependency provenance (ADR-008)

## papaparse.mjs

- **Package:** papaparse @ **5.4.1** (MIT)
- **Source:** https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm (jsDelivr ESM build of papaparse.min.js)
- **SHA-256:** `eb321aae09b96a6e5c0797250145809ccdc46319fcc2b569d6af15d8106f4368`
- **Bytes:** 19735
- **Certified by:** Aaron (authority) — authorized for the BIBS build after the supply-chain guard
  (ADR-008 / verify-before-assert) blocked an unattended fetch.
- **Basis:** pinned exact version; SHA-256 recorded; functionally verified inside the build image
  (`node:20-alpine`) — parses a quoted, embedded-comma CSV with `header:true, dynamicTyping:false,
  skipEmptyLines:"greedy"` and returns the expected rows with zero errors.
- **Use:** CSV tokenizing only (§5). `dynamicTyping` MUST stay disabled; all CSV type narrowing is
  BIBSS-controlled (§7.1.3). The compiled artifact makes no network requests at runtime (§2.2); this
  file is bundled at build time.
