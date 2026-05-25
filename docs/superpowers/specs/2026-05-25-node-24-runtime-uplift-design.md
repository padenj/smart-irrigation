# Node 24 runtime uplift design

## Goal

Align Smart Irrigation's supported runtime across GitHub Actions, fresh installs, and on-device updates by making **Node 24** the single supported baseline.

## Problem

The current repository state can be installed successfully under newer local tooling while failing in GitHub Actions under the existing Node 20 workflow. The immediate failure appears during `npm ci`, before the build step, because the lockfile and dependency resolution behavior are no longer consistent across environments.

## Scope

This change covers:

- `.github/workflows/release.yaml`
- `install.sh`
- `scripts/update-smart-irrigation.sh`
- deployment/runtime documentation that currently describes Node 20 as the release baseline

This change does **not** try to preserve Node 20 compatibility.

## Chosen approach

Adopt **Node 24 everywhere**:

1. Run the release workflow on Node 24.
2. Provision or upgrade devices to Node 24 during install.
3. Provision or upgrade devices to Node 24 during staged updates before `npm ci --omit=dev`.
4. Update repo instructions to document Node 24 as the supported baseline.

This fixes the source problem by removing runtime drift rather than trying to make one lockfile behave identically under multiple npm major versions.

## Design

### 1. GitHub Actions

Update `release.yaml` so the build job uses Node 24 instead of Node 20.

Also update the workflow action versions used for checkout and Node setup so the workflow itself is on currently supported GitHub Actions versions instead of older Node-20-based action runtimes.

### 2. Fresh install path

Update `install.sh` so `install_system_dependencies()` ensures Node 24 is installed before any app dependency installation runs.

If Node/npm are missing, the installer should provision Node 24.

If Node is already installed but is on a different major version, the installer should upgrade it to Node 24 before continuing.

### 3. Update path

Update `scripts/update-smart-irrigation.sh` so the updater ensures Node 24 is installed before the staged `npm ci --omit=dev` step.

The version check and upgrade must occur before dependencies are installed for the staged release.

If Node 24 provisioning fails, the updater should fail clearly and rely on the existing failure and rollback behavior rather than attempting to continue on the wrong runtime.

### 4. Runtime contract

Update deployment-facing documentation and repo instructions so the supported baseline is explicitly Node 24 for:

- GitHub Actions release builds
- fresh installs
- staged update installs

The production app entrypoint remains `node build/server/index.js`.

## Error handling

- If Node 24 installation or upgrade fails in `install.sh`, exit with a clear error before app installation continues.
- If Node 24 installation or upgrade fails in `scripts/update-smart-irrigation.sh`, stop the update and let the existing updater failure path report the error and preserve/restore the running installation as designed.
- Do not silently fall back to Node 20 or "best effort" installs.

## Verification

Verify the change with:

1. a local `npm ci` under Node 24,
2. a local `npm run build`,
3. inspection of the workflow to confirm Node 24 is used,
4. targeted checks that both install and update scripts provision or upgrade to Node 24 before `npm ci`.

## Expected outcome

After this change, lockfile generation expectations, CI installs, fresh installs, and staged updates will all use the same Node major version. That should eliminate the current GitHub Actions failure caused by runtime mismatch.
