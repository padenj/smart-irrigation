# Copilot instructions for Smart Irrigation

## Product overview
- This repository is a full-stack smart irrigation controller intended for Raspberry Pi/Linux deployment.
- The application combines a React/Vite frontend with an Express + Remult backend in one Node.js app.
- Core capabilities include irrigation zone control, scheduled programs, sensor reads, weather-driven decisions, LCD display updates, system logs, history snapshots, and a lightweight PWA install flow.

## Architecture map
- `src/pages`, `src/components`, `src/hooks`: browser UI for dashboard, zones, programs, settings, history, logs, and LCD display views.
- `src/server`: backend entrypoint, controllers, weather integrations, cron scheduling, and hardware adapters.
- `src/server/hardware`: GPIO, LCD, ADS1115, and I2C-facing code. Keep direct hardware access here.
- `src/shared`: shared domain contracts/entities used across client and server.
- `src/server/dto`: Remult DTO classes used by controller repositories for persisted settings, status, and programs.
- `db/`: runtime data that is preserved across deployments and excluded from release packages.
- `.github/workflows/release.yaml` and `install.sh`: the release and Raspberry Pi deployment path.

## Working conventions
- Treat the app as one coupled system: changes to irrigation behavior usually need matching updates in shared models, backend controllers, and the React UI.
- Prefer extending existing controllers (`SystemController`, `ZoneController`, `ProgramController`, `SensorController`, `WeatherController`, `DisplayController`, `HistoryController`) instead of adding unrelated ad-hoc routes.
- Preserve timezone-aware behavior by using the existing Luxon and `DateTimeUtils` helpers.
- Keep hardware-specific behavior mockable and isolated behind controller or hardware interfaces.
- Check both `src/shared/*` and `src/server/dto/*` before refactoring persistence-related models; this codebase currently mixes shared contracts with DTO-backed repositories.
- Preserve the current deployment shape: production serves the SPA from `build/dist` and runs the server from `build/server/index.js`.
