---
applyTo: ".github/workflows/**/*.yml,.github/workflows/**/*.yaml,install.sh,package.json,scripts/**/*.js,src/server/index.ts"
---

# Deployment guidance

- Deployment targets a Linux host with Raspberry Pi-style hardware access. Do not assume containers, serverless, or multi-service orchestration unless explicitly requested.
- The canonical production entrypoint is `node build/server/index.js`.
- The client build output must remain in `build/dist`, because:
  - `src/server/index.ts` serves static assets from that directory
  - `version.txt` is read from that directory
  - the release workflow copies `version.txt` into that directory
- The GitHub Actions release flow currently:
  1. runs on pushes to `main`
  2. uses Node 20
  3. runs `npm ci`
  4. runs `npm run build`
  5. increments a semantic version tag
  6. writes `version.txt`
  7. zips the repository while excluding `.git`, `node_modules`, and `db`
  8. uploads the zip as a GitHub Release asset
- `install.sh` is part of the supported deployment path. Preserve these assumptions when editing it:
  - install location: `/opt/smart-irrigation`
  - systemd service name: `smart-irrigation`
  - service runs as `root`
  - production install runs `npm ci --omit=dev`
  - `/opt/smart-irrigation/db` is preserved during updates
  - hourly auto-update runs from `/usr/local/bin/update-smart-irrigation.sh`
- On-device debugging should assume:
  - the app process itself listens on port `3000`, even if another port is exposed externally
  - service logs come from `journalctl -u smart-irrigation.service`
  - updater logs are typically in `/var/log/smart-irrigation-update.log`
  - installed version is tracked in `/opt/smart-irrigation/.version` and also exposed by `/api/version`
- Direct device changes are not enough on their own. If you patch installer, updater, service units, or device-only config manually, reflect that change in the repo so the next install/update reproduces it.
- The current updater replaces the install directory in place and may emit non-fatal cleanup errors while preserving `db/`. Be careful when changing cleanup logic: preserve runtime data and `.env.local`, and keep update failure modes observable in logs.
- If you change packaging or startup behavior, keep the release package, version file, systemd unit, and update script consistent with each other.
