export type UpdateState =
    | 'idle'
    | 'checking'
    | 'available'
    | 'up-to-date'
    | 'updating'
    | 'succeeded'
    | 'failed'
    | 'unsupported';

export interface UpdateStatus {
    schemaVersion: number;
    state: UpdateState;
    message: string | null;
    error: string | null;
    currentVersion: string | null;
    latestVersion: string | null;
    targetVersion: string | null;
    updateAvailable: boolean | null;
    serviceAvailable: boolean;
    lastCheckedAt: string | null;
    lastStartedAt: string | null;
    lastCompletedAt: string | null;
    lastHeartbeatAt: string | null;
    logPath: string | null;
}

export interface LatestReleaseInfo {
    version: string;
    assetUrl: string;
    checkedAt: string;
}

export const UPDATE_STATUS_SCHEMA_VERSION = 1;
export const UPDATE_STATUS_STALE_AFTER_MS = 10 * 60 * 1000;
export const UPDATE_CHECK_CACHE_TTL_MS = 5 * 60 * 1000;

export function createDefaultUpdateStatus(): UpdateStatus {
    return {
        schemaVersion: UPDATE_STATUS_SCHEMA_VERSION,
        state: 'idle',
        message: null,
        error: null,
        currentVersion: null,
        latestVersion: null,
        targetVersion: null,
        updateAvailable: null,
        serviceAvailable: false,
        lastCheckedAt: null,
        lastStartedAt: null,
        lastCompletedAt: null,
        lastHeartbeatAt: null,
        logPath: '/var/log/smart-irrigation-update.log',
    };
}
