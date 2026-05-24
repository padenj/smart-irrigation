# Smart Irrigation System

Smart Irrigation is a single Node.js application for Raspberry Pi/Linux irrigation control. It serves a React/Vite frontend and an Express + Remult backend from the same process, manages GPIO-driven irrigation zones, runs scheduled programs, reads sensors, mirrors LCD output, stores history/logs locally, and supports release-based self-updates on the device.

## Core capabilities

- Automated irrigation programs with ordered zones and durations
- Manual zone and program control from the UI
- Weather-aware behavior and recurring weather refresh
- Sensor polling, historical snapshots, and system logs
- Dashboard health visibility for scheduler freshness, relay anomalies, and storage pressure
- Raspberry Pi/Linux deployment with systemd service management and hourly update checks
- Settings controls for checking updates and starting the updater on demand

## Runtime architecture

- Frontend: React/Vite in `src/pages`, `src/components`, and `src/hooks`
- Backend: Express + Remult in `src/server`
- Shared contracts: `src/shared`
- Persisted runtime data: `db/`
- Production server entrypoint: `build/server/index.js`
- Production frontend assets: `build/dist`

Important recurring jobs in `src/server/index.ts`:

- Every 15 seconds: scheduler heartbeat and due-program execution via `system/run`
- Every minute: relay reconciliation via `system/validateRelayState`
- Every `UPDATE_FREQUENCY_MINUTES`: weather refresh and history snapshotting via `system/update`
- Daily: schedule recalculation and retention pruning

## Installation

```bash
wget -O install.sh https://raw.githubusercontent.com/padenj/smart-irrigation/main/install.sh
sudo bash install.sh
```

The installer:

- installs the app into `/opt/smart-irrigation`
- creates the `smart-irrigation` systemd service
- preserves `/opt/smart-irrigation/db`
- installs the hourly updater at `/usr/local/bin/update-smart-irrigation.sh`
- installs `smart-irrigation-update.service` and configures hourly cron to start it with `systemctl --no-block`
- caps systemd journal usage to avoid filling the SD card

## Device debugging quick reference

### Service and version checks

```bash
systemctl status smart-irrigation --no-pager
journalctl -u smart-irrigation.service -n 200 --no-pager
curl http://localhost:3000/api/version
```

Some devices also expose the app through port 80, but the app process itself listens on port 3000.

### Update diagnostics

```bash
tail -n 100 /var/log/smart-irrigation-update.log
sudo systemctl start smart-irrigation-update.service
cat /opt/smart-irrigation/.version
```

Notes:

- hourly updates are driven by cron starting `smart-irrigation-update.service`
- the updater persists status in `db/updateStatus.json`
- updates can cause a brief outage while files are replaced and the service restarts
- updates are staged before swap, preserve `db/` and `.env.local`, and attempt rollback if the new app fails its post-restart health check

### Scheduler and relay diagnostics

Use these when a zone appears stuck, a program stops unexpectedly, or relay state looks wrong:

```bash
curl -X POST http://localhost:3000/api/system/getHealthSummary \
  -H 'Content-Type: application/json' \
  -d '{"args":[]}'

curl -X POST http://localhost:3000/api/system/validateRelayState \
  -H 'Content-Type: application/json' \
  -d '{"args":[]}'
```

Check the persisted app data:

- `db/systemLogs.json` for structured application events
- `db/systemStatusSnapshot.json` for historical snapshots

Relevant log patterns:

- `program-start`, `zone-start`, `zone-stop`
- `zone-divergence` when the expected active zone no longer matches system state
- `relay-on`, `relay-off`, `relay-reconciled`

## Important scheduler safety rules

Recent production debugging established a few invariants that future changes must preserve:

- scheduler heartbeat updates must only patch `lastSchedulerRun`; do not spread stale `SystemStatus` back into storage
- if a running zone loses ownership of `activeZone`, the relay must be forced off and the divergence logged
- relay outputs are revalidated once per minute to catch mismatches between expected and actual hardware state
- retention pruning must stay off the request hot path because large JSON-backed storage can stall UI requests on the device

## Development notes

- The app is a coupled system: irrigation behavior often spans shared types, backend controllers, and UI surfaces.
- Favor existing controllers and shared contracts over ad hoc routes or duplicated client state.
- If you make direct device-side fixes, capture them in the repository and install flow so future deployments remain reproducible.

## License

This project is licensed under the [MIT License](LICENSE).