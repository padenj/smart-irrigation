---
applyTo: "src/pages/**/*.tsx,src/components/**/*.tsx,src/server/controllers/**/*.ts,src/server/integrations/**/*.ts,public/**/*,README.md"
---

# Application capabilities guidance

- This application currently supports these major capabilities:
  - dashboard visibility into weather, next scheduled runs, sensor readings, and active system state
  - irrigation zone CRUD with GPIO port assignment, enable/disable state, and manual run/stop controls
  - irrigation program CRUD with scheduled days/times, ordered zone durations, enable/disable state, skip-next-run behavior, manual run/stop, and simple run conditions
  - weather integration through both WeatherAPI and OpenWeatherMap
  - configurable sensor handling, including raw, voltage, and percent conversions
  - LCD page management and live mirrored display output
  - persisted application logs plus systemd journal and `top` views
  - historical status snapshots with charting, filtering, date ranges, and CSV export
  - PWA installation via manifest, service worker, and install banner
  - system maintenance endpoints for rebooting the host and restarting the app service
- New work should fit the existing irrigation domain. Reuse the current concepts of zones, programs, system status, settings, logs, snapshots, weather data, and LCD pages.
- When adding user-facing features, keep both operational control and monitoring in mind; this app is used to both automate irrigation and inspect what the controller is doing.
- When changing weather or scheduling behavior, preserve support for manual overrides and visibility in the dashboard/logging/history surfaces.
