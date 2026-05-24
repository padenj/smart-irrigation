import { useEffect, useState } from 'react';
import { Activity, HardDrive, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { SystemHealthSummary } from '../shared/systemHealth';
import { DateTimeUtils } from '../server/utilities/DateTimeUtils';
import { useSettingsContext } from '../hooks/SettingsContext';

function formatBytes(bytes: number | null): string {
    if (bytes === null) {
        return 'Unavailable';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = -1;
    do {
        value /= 1024;
        unitIndex += 1;
    } while (value >= 1024 && unitIndex < units.length - 1);

    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function SystemHealthCard() {
    const [health, setHealth] = useState<SystemHealthSummary | null>(null);
    const systemSettings = useSettingsContext();

    useEffect(() => {
        const loadHealth = async () => {
            try {
                const response = await fetch('/api/system/getHealthSummary', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ args: [] }),
                });
                if (!response.ok) {
                    throw new Error(`Health request failed with ${response.status}`);
                }

                const summary = await response.json() as SystemHealthSummary | { result?: SystemHealthSummary };
                setHealth('result' in summary && summary.result ? summary.result : summary);
            } catch (error) {
                console.error('Failed to load system health summary:', error);
            }
        };

        void loadHealth();
        const interval = setInterval(() => {
            void loadHealth();
        }, 30_000);

        return () => clearInterval(interval);
    }, []);

    if (!health) {
        return "Loading...";
    }

    const snapshotFile = health.disk.files.find((file) => file.path.endsWith('systemStatusSnapshot.json'));
    const appLogFile = health.disk.files.find((file) => file.path.endsWith('systemLogs.json'));
    const hasWarnings = health.logs.errorsLast15Minutes > 0 || health.logs.divergencesLast24Hours > 0 || health.activeZone.isOverdue;

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">System Health</h2>
                {hasWarnings ? (
                    <TriangleAlert className="h-5 w-5 text-yellow-600" />
                ) : (
                    <ShieldAlert className="h-5 w-5 text-green-600" />
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-gray-900">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Scheduler</span>
                    </div>
                    <p className={health.scheduler.isFresh ? 'text-green-700' : 'text-red-700'}>
                        {health.scheduler.isFresh ? 'Healthy' : 'Delayed'}
                        {health.scheduler.ageSeconds !== null ? ` · ${health.scheduler.ageSeconds}s ago` : ''}
                    </p>
                    <p className="text-sm text-gray-600">
                        Last run: {health.scheduler.lastRun
                            ? DateTimeUtils.isoToDateTimeShortStr(health.scheduler.lastRun, systemSettings.timezone)
                            : 'Unavailable'}
                    </p>
                    <p className="text-sm text-gray-600">
                        Active zone: {health.activeZone.zoneName ?? 'None'}
                        {health.activeZone.remainingSeconds !== null ? ` · ${health.activeZone.remainingSeconds}s remaining` : ''}
                    </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-gray-900">
                        <HardDrive className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Storage</span>
                    </div>
                    <p className="text-sm text-gray-700">
                        Filesystem: {formatBytes(health.disk.filesystemUsedBytes)} used / {formatBytes(health.disk.filesystemTotalBytes)} total
                        {health.disk.filesystemUsePercent !== null ? ` (${health.disk.filesystemUsePercent}%)` : ''}
                    </p>
                    <p className="text-sm text-gray-700">Available: {formatBytes(health.disk.filesystemAvailableBytes)}</p>
                    <p className="text-sm text-gray-700">Journal: {formatBytes(health.disk.journalSizeBytes)}</p>
                    <p className="text-sm text-gray-700">Snapshots: {formatBytes(snapshotFile?.sizeBytes ?? null)}</p>
                    <p className="text-sm text-gray-700">App logs: {formatBytes(appLogFile?.sizeBytes ?? null)}</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-3">
                    <p className="text-sm text-gray-500">Warnings (15m)</p>
                    <p className="text-xl font-semibold text-yellow-700">{health.logs.warningsLast15Minutes}</p>
                </div>
                <div className="rounded-lg border p-3">
                    <p className="text-sm text-gray-500">Errors (15m)</p>
                    <p className="text-xl font-semibold text-red-700">{health.logs.errorsLast15Minutes}</p>
                </div>
                <div className="rounded-lg border p-3">
                    <p className="text-sm text-gray-500">Divergences (24h)</p>
                    <p className="text-xl font-semibold text-yellow-700">{health.logs.divergencesLast24Hours}</p>
                </div>
                <div className="rounded-lg border p-3">
                    <p className="text-sm text-gray-500">Relay reconciliations (24h)</p>
                    <p className="text-xl font-semibold text-blue-700">{health.logs.reconciliationsLast24Hours}</p>
                </div>
            </div>

            {health.disk.errors.length > 0 && (
                <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                    {health.disk.errors.join(' · ')}
                </div>
            )}
        </div>
    );
}
