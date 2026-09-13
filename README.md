# Top Shelf

Top Shelf is a collection of personal rating lists across movies, TV, books, podcasts, restaurants, scotches, and future domains. Movies and TV are the first planned areas.

Version **0.0.1.2** adds eight rating-list tabs with supplied icons, counts, keyboard navigation (1–8), and remembered selection. Each opens a starter view. The foundation retains centered search for Notes and support content, one autosaving Notes modal, vertical Settings, appearance controls, Help, one initial release, an empty Roadmap, shortcuts, and optional Developer Mode. Rating-list entry, scoring, and their data model have not been implemented.

## Run locally

This is static HTML, CSS, and JavaScript with no build step or runtime dependency. Serve this directory with `python3 -m http.server 8000`, then open http://localhost:8000. Stop the server with Control-C. An ordinary static host also works. Install and service-worker features need HTTPS or localhost.

## Data and GitHub Sync

Notes save in browser storage under a Top Shelf namespace. Export full JSON backups in Settings; import and recovery preserve a copy before replacing local data. Credentials stay outside backups, sync payloads, and diagnostics. Cloud data carries Notes and any nonempty legacy record content; settings remain on each device.

GitHub Sync is enabled and fixed to `themadat/app-data/main/data/top-shelf.json`. The external file and token still need user setup:

1. In [app-data/data](https://github.com/themadat/app-data/tree/main/data), create `top-shelf.json` on `main` containing `{}` and commit it.
2. Create a [fine-grained token](https://github.com/settings/personal-access-tokens) named Top Shelf, resource owner `themadat`, **Only select repositories → app-data**, **Contents → Read and write**.
3. Enter the token only in **Settings → Data Sync**, select whether to remember it, then **Test** and **Save**. Never paste the token into chat or source.
4. Use **Sync Now**, configure another browser, and confirm a Notes upload/download round trip. Configure credentials separately on each device.

The target is configured locally; file existence, token permissions, and a real round trip remain unverified until this checklist is completed. See [reset/setup checklist](docs/RESET.md).

## Artwork and hosting

`assets/icons/top-shelf.svg` is the supplied editable star-and-shelf artwork. Light and dark variants share that source. Maskable assets scale the complete foreground to 70% on a full-bleed blue canvas for circular crop safety. Install, touch, favicon, and splash assets are checked in.

The [repository](https://github.com/themadat/top-shelf) retains its GitHub Pages Actions workflow. Set Pages Source to GitHub Actions for a single deployment path. No repository creation, commits, push, or deployment is part of this reset.

See [architecture](docs/ARCHITECTURE.md), [components](docs/COMPONENTS.md), [customization](docs/CUSTOMIZATION.md), [testing](docs/TESTING.md), and [two-laptop Git setup](docs/GIT-SETUP.md). Agent lifecycle contracts live in [the handoff](context/LLM_HANDOFF.md).
