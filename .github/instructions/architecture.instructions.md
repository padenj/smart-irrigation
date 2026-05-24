---
applyTo: "src/**/*.ts,src/**/*.tsx"
---

# Architecture guidance

- The application is a monorepo-style single app, not separate frontend and backend services.
- `src/server/index.ts` starts the Express server, mounts the Remult API, serves `build/dist`, and schedules recurring jobs with `node-cron`.
- Startup flow matters:
  1. server boot
  2. `api` mount
  3. static asset serving
  4. `system/init`
  5. recurring scheduler, daily, and weather/history jobs
- Scheduler responsibilities are intentionally split:
  - `SystemController.run`: sensor reads, scheduler heartbeat, display time updates, next program execution
  - `SystemController.update`: weather refresh plus history snapshotting
  - `SystemController.daily`: schedule recalculation
  - `SystemController.validateRelayState`: minute-level relay reconciliation safety check
  - `SystemController.pruneRetention`: off-hours retention pruning for logs and snapshots
- Domain ownership:
  - `ZoneController`: manual zone runs, stop requests, relay control
  - `ProgramController`: program scheduling, conditional runs, sequencing zones
  - `SensorController`: sensor polling, conversion, throttling, display updates
  - `WeatherController`: provider selection and refresh cadence
  - `DisplayController`: LCD page storage, formatting, page cycling
  - `HistoryController`: persisted status snapshots
  - `LogController`: application log persistence
- The frontend relies on existing patterns:
  - `liveQuery` for zones, programs, logs, and LCD pages
  - polling contexts for system status and settings
  - route-driven pages in `App.tsx`
- Preserve these scheduler/relay invariants:
  - heartbeat updates must patch `lastSchedulerRun` without rewriting unrelated `SystemStatus` fields
  - a zone run that loses `activeZone` ownership must force the relay off and log a divergence event
  - relay state can drift from persisted status, so minute-level reconciliation is part of the expected architecture
  - heavy retention work should stay off interactive request paths because the device uses JSON-backed persistence and can stall under large files
- When you add a feature, prefer wiring it through existing shared types and controller methods rather than duplicating state in the UI.
- Preserve these user-facing surfaces unless explicitly asked to redesign them:
  - dashboard
  - zone management
  - program management
  - settings
  - history charts and CSV export
  - system log viewers
  - LCD display mirror
