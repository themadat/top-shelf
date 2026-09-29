# WISH-001 — TV Library Closeout

Implementation complete; closed with the 2.0.0 release cut. Commit/deployment are separate actions and have not been performed by this cut.

Delivered: independent TV library; manual/TMDB lookup; show/season/half-point episode ratings; episode and season notes; rankings; compact editor; filters and pivot cards; local widths; additive imports; offline editing; safe backup/recovery/cloud integration.

Current contracts: [TV.md](../docs/TV.md) and [DATA-CONTRACTS.md](../docs/DATA-CONTRACTS.md). File map: [LLM_HANDOFF.md](LLM_HANDOFF.md). Verification scope: [TESTING.md](../docs/TESTING.md). The original design and incremental validation are retained in Git history; they are not current implementation instructions.

Cut verification: 121 automated tests; isolated desktop/390/320px and dark-mode smoke checks; offline edit/reload; backup/cloud-model round trips; full-localStorage restore/recovery and failed-write preservation. Preview stopped.

Known limits: live authenticated TMDB/GitHub and cross-device sync require separate verification; browser checks use isolated data and mocked network responses. No new-episode polling/alerts. The active library still uses localStorage; oversized libraries fail safely even with IndexedDB recovery.
