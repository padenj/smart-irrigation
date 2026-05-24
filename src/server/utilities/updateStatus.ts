import axios from 'axios';
import {
    createDefaultUpdateStatus,
    type LatestReleaseInfo,
    UPDATE_CHECK_CACHE_TTL_MS,
    UPDATE_STATUS_SCHEMA_VERSION,
    UPDATE_STATUS_STALE_AFTER_MS,
    type UpdateStatus,
} from '../../shared/updateStatus';

const GITHUB_RELEASE_API_URL = 'https://api.github.com/repos/padenj/smart-irrigation/releases/latest';
export const UPDATE_SERVICE_NAME = 'smart-irrigation-update.service';
export const UPDATE_LOG_PATH = '/var/log/smart-irrigation-update.log';
const UPDATE_STATUS_FILE = 'updateStatus.json';

export function getUpdateStatusPath(baseDir = process.cwd()): string {
    return `${baseDir}/db/${UPDATE_STATUS_FILE}`;
}

async function execFileAsync(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    const { execFile } = await import('child_process');

    return new Promise((resolve, reject) => {
        execFile(command, args, (error, stdout, stderr) => {
            if (error) {
                reject(Object.assign(error, { stdout, stderr }));
                return;
            }

            resolve({ stdout, stderr });
        });
    });
}

export async function getCurrentVersion(baseDir = process.cwd()): Promise<string | null> {
    const fs = await import('fs/promises');
    const versionPaths = [
        `${baseDir}/.version`,
        `${baseDir}/build/dist/version.txt`,
    ];

    for (const versionPath of versionPaths) {
        try {
            const version = (await fs.readFile(versionPath, 'utf8')).trim();
            if (version) {
                return version;
            }
        } catch {
            continue;
        }
    }

    return null;
}

export function normalizeUpdateStatus(
    status: Partial<UpdateStatus> | null | undefined,
    currentVersion: string | null,
    serviceAvailable: boolean
): UpdateStatus {
    const defaults = createDefaultUpdateStatus();
    const normalized: UpdateStatus = {
        ...defaults,
        ...status,
        schemaVersion: UPDATE_STATUS_SCHEMA_VERSION,
        currentVersion,
        serviceAvailable,
        logPath: status?.logPath ?? defaults.logPath,
    };

    if (normalized.latestVersion && normalized.currentVersion) {
        normalized.updateAvailable = normalized.latestVersion !== normalized.currentVersion;
    }

    if (normalized.targetVersion && normalized.currentVersion && normalized.targetVersion === normalized.currentVersion && normalized.state === 'available') {
        normalized.state = 'up-to-date';
    }

    return normalized;
}

export async function isSystemdAvailable(): Promise<boolean> {
    try {
        const fs = await import('fs/promises');
        await fs.access('/run/systemd/system');
        await execFileAsync('systemctl', ['--version']);
        return true;
    } catch {
        return false;
    }
}

export async function isUpdateServiceInstalled(): Promise<boolean> {
    if (!(await isSystemdAvailable())) {
        return false;
    }

    const unitPaths = [
        `/etc/systemd/system/${UPDATE_SERVICE_NAME}`,
        `/lib/systemd/system/${UPDATE_SERVICE_NAME}`,
        `/usr/lib/systemd/system/${UPDATE_SERVICE_NAME}`,
    ];

    for (const unitPath of unitPaths) {
        try {
            const fs = await import('fs/promises');
            await fs.access(unitPath);
            return true;
        } catch {
            continue;
        }
    }

    return false;
}

export async function isUpdateServiceActive(): Promise<boolean> {
    if (!(await isUpdateServiceInstalled())) {
        return false;
    }

    try {
        const { stdout } = await execFileAsync('systemctl', ['is-active', UPDATE_SERVICE_NAME]);
        const state = stdout.trim();
        return state === 'active' || state === 'activating';
    } catch (error) {
        const stdout = typeof error === 'object' && error && 'stdout' in error && typeof error.stdout === 'string'
            ? error.stdout.trim()
            : '';
        return stdout === 'active' || stdout === 'activating';
    }
}

async function readStoredUpdateStatus(baseDir = process.cwd()): Promise<Partial<UpdateStatus> | null> {
    try {
        const fs = await import('fs/promises');
        const raw = await fs.readFile(getUpdateStatusPath(baseDir), 'utf8');
        return JSON.parse(raw) as Partial<UpdateStatus>;
    } catch {
        return null;
    }
}

export async function writeUpdateStatus(status: UpdateStatus, baseDir = process.cwd()): Promise<UpdateStatus> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const statusPath = getUpdateStatusPath(baseDir);
    await fs.mkdir(path.dirname(statusPath), { recursive: true });

    const tempPath = `${statusPath}.${process.pid}.tmp`;
    const fileHandle = await fs.open(tempPath, 'w');
    try {
        await fileHandle.writeFile(`${JSON.stringify(status, null, 2)}\n`, 'utf8');
        await fileHandle.sync();
    } finally {
        await fileHandle.close();
    }

    await fs.rename(tempPath, statusPath);
    return status;
}

export async function readUpdateStatus(baseDir = process.cwd()): Promise<UpdateStatus> {
    const [currentVersion, serviceAvailable, storedStatus] = await Promise.all([
        getCurrentVersion(baseDir),
        isUpdateServiceInstalled(),
        readStoredUpdateStatus(baseDir),
    ]);

    return normalizeUpdateStatus(storedStatus, currentVersion, serviceAvailable);
}

export async function mergeUpdateStatus(
    patch: Partial<UpdateStatus>,
    baseDir = process.cwd()
): Promise<UpdateStatus> {
    const currentStatus = await readUpdateStatus(baseDir);
    const merged = normalizeUpdateStatus(
        {
            ...currentStatus,
            ...patch,
        },
        patch.currentVersion ?? currentStatus.currentVersion,
        patch.serviceAvailable ?? currentStatus.serviceAvailable
    );

    return writeUpdateStatus(merged, baseDir);
}

export function shouldReuseRecentUpdateCheck(status: UpdateStatus, nowMs = Date.now()): boolean {
    if (!status.lastCheckedAt) {
        return false;
    }

    const lastCheckedMs = new Date(status.lastCheckedAt).getTime();
    if (Number.isNaN(lastCheckedMs)) {
        return false;
    }

    return nowMs - lastCheckedMs < UPDATE_CHECK_CACHE_TTL_MS && !!status.latestVersion;
}

export function deriveCheckedUpdateStatus(
    currentStatus: UpdateStatus,
    latestRelease: LatestReleaseInfo
): UpdateStatus {
    const updateAvailable = currentStatus.currentVersion !== null
        ? latestRelease.version !== currentStatus.currentVersion
        : true;

    return normalizeUpdateStatus(
        {
            ...currentStatus,
            state: updateAvailable ? 'available' : 'up-to-date',
            message: updateAvailable
                ? `Update ${latestRelease.version} is available.`
                : `Already on the latest version${latestRelease.version ? ` (${latestRelease.version})` : ''}.`,
            error: null,
            latestVersion: latestRelease.version,
            targetVersion: updateAvailable ? latestRelease.version : null,
            updateAvailable,
            lastCheckedAt: latestRelease.checkedAt,
        },
        currentStatus.currentVersion,
        currentStatus.serviceAvailable
    );
}

export async function fetchLatestReleaseInfo(): Promise<LatestReleaseInfo> {
    try {
        const response = await axios.get(GITHUB_RELEASE_API_URL, {
            timeout: 10_000,
            headers: {
                Accept: 'application/vnd.github+json',
                'User-Agent': 'smart-irrigation-updater',
            },
            validateStatus: () => true,
        });

        if (response.status >= 400) {
            const remaining = response.headers['x-ratelimit-remaining'];
            if (response.status === 403 && remaining === '0') {
                throw new Error('GitHub API rate limit exceeded while checking for updates');
            }

            throw new Error(`GitHub release check failed with status ${response.status}`);
        }

        const latestVersion = typeof response.data?.tag_name === 'string' ? response.data.tag_name.trim() : '';
        const zipAsset = Array.isArray(response.data?.assets)
            ? response.data.assets.find((asset: { name?: string; browser_download_url?: string }) =>
                typeof asset.name === 'string' &&
                asset.name.endsWith('.zip') &&
                typeof asset.browser_download_url === 'string' &&
                asset.browser_download_url.length > 0
            )
            : null;

        if (!latestVersion) {
            throw new Error('GitHub latest release did not include a tag_name');
        }

        if (!zipAsset?.browser_download_url) {
            throw new Error('GitHub latest release did not include a zip asset');
        }

        return {
            version: latestVersion,
            assetUrl: zipAsset.browser_download_url,
            checkedAt: new Date().toISOString(),
        };
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }

        throw new Error(`Failed to check GitHub releases: ${String(error)}`);
    }
}

export async function reconcileStaleUpdateStatus(baseDir = process.cwd()): Promise<UpdateStatus> {
    const status = await readUpdateStatus(baseDir);
    if (status.state !== 'checking' && status.state !== 'updating') {
        return status;
    }

    if (!status.lastHeartbeatAt) {
        return status;
    }

    const heartbeatMs = new Date(status.lastHeartbeatAt).getTime();
    if (Number.isNaN(heartbeatMs) || Date.now() - heartbeatMs <= UPDATE_STATUS_STALE_AFTER_MS) {
        return status;
    }

    if (await isUpdateServiceActive()) {
        return status;
    }

    return mergeUpdateStatus(
        {
            state: 'failed',
            message: 'The updater stopped reporting progress before completion.',
            error: 'Updater heartbeat became stale',
            lastCompletedAt: new Date().toISOString(),
        },
        baseDir
    );
}

export async function checkForUpdates(baseDir = process.cwd(), forceRefresh = false): Promise<UpdateStatus> {
    const currentStatus = await reconcileStaleUpdateStatus(baseDir);
    if (!forceRefresh && shouldReuseRecentUpdateCheck(currentStatus)) {
        return currentStatus;
    }

    await mergeUpdateStatus(
        {
            state: 'checking',
            message: 'Checking GitHub for the latest release...',
            error: null,
            lastHeartbeatAt: new Date().toISOString(),
        },
        baseDir
    );

    try {
        const latestRelease = await fetchLatestReleaseInfo();
        const nextStatus = deriveCheckedUpdateStatus(await readUpdateStatus(baseDir), latestRelease);
        return writeUpdateStatus(nextStatus, baseDir);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return mergeUpdateStatus(
            {
                state: 'failed',
                message: 'Unable to check for updates.',
                error: message,
                lastCheckedAt: new Date().toISOString(),
                lastCompletedAt: new Date().toISOString(),
            },
            baseDir
        );
    }
}

export async function startUpdateService(baseDir = process.cwd()): Promise<UpdateStatus> {
    const serviceAvailable = await isUpdateServiceInstalled();
    if (!serviceAvailable) {
        return mergeUpdateStatus(
            {
                state: 'unsupported',
                message: 'Update service is not installed on this system.',
                error: null,
                serviceAvailable: false,
                lastCompletedAt: new Date().toISOString(),
            },
            baseDir
        );
    }

    const checkedStatus = await checkForUpdates(baseDir, false);
    if (checkedStatus.state === 'failed' || checkedStatus.state === 'unsupported') {
        return checkedStatus;
    }

    try {
        await execFileAsync('systemctl', ['--no-block', 'start', UPDATE_SERVICE_NAME]);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return mergeUpdateStatus(
            {
                state: 'failed',
                message: 'Failed to start the updater service.',
                error: message,
                lastCompletedAt: new Date().toISOString(),
            },
            baseDir
        );
    }

    return mergeUpdateStatus(
        {
            state: 'updating',
            message: checkedStatus.updateAvailable
                ? `Preparing to install ${checkedStatus.latestVersion}.`
                : 'Update requested. The updater service will verify the latest release.',
            error: null,
            lastStartedAt: new Date().toISOString(),
            lastHeartbeatAt: new Date().toISOString(),
            targetVersion: checkedStatus.latestVersion,
            serviceAvailable: true,
        },
        baseDir
    );
}
