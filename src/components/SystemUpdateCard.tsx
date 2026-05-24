import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useSettingsContext } from '../hooks/SettingsContext';
import { createDefaultUpdateStatus, type UpdateStatus } from '../shared/updateStatus';

type RemultResponse<T> = T | { data?: T; result?: T };

function unwrapResponse<T>(payload: RemultResponse<T>): T {
    if (typeof payload === 'object' && payload !== null) {
        if ('result' in payload && payload.result) {
            return payload.result;
        }

        if ('data' in payload && payload.data) {
            return payload.data;
        }
    }

    return payload as T;
}

async function callSystemMethod<T>(methodName: string, args: unknown[] = []): Promise<T> {
    const response = await fetch(`/api/system/${methodName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ args }),
    });

    if (!response.ok) {
        throw new Error(`${methodName} failed with status ${response.status}`);
    }

    const payload = await response.json() as RemultResponse<T>;
    return unwrapResponse(payload);
}

function formatTimestamp(value: string | null, timezone: string | undefined): string {
    if (!value) {
        return 'Unavailable';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Unavailable';
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: timezone || 'UTC',
    }).format(date);
}

function formatState(state: UpdateStatus['state']): string {
    return state.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

export function SystemUpdateCard() {
    const settings = useSettingsContext();
    const [status, setStatus] = useState<UpdateStatus>(createDefaultUpdateStatus());
    const [loading, setLoading] = useState(true);
    const [actionError, setActionError] = useState<string | null>(null);
    const [runningAction, setRunningAction] = useState<'check' | 'update' | null>(null);

    const loadStatus = async () => {
        try {
            const latestStatus = await callSystemMethod<UpdateStatus>('getUpdateStatus');
            setStatus(latestStatus);
            setActionError(null);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : String(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadStatus();
        const interval = window.setInterval(() => {
            void loadStatus();
        }, 15_000);

        return () => window.clearInterval(interval);
    }, []);

    const handleAction = async (action: 'check' | 'update') => {
        setRunningAction(action);
        setActionError(null);

        try {
            const method = action === 'check' ? 'checkForUpdates' : 'startUpdate';
            const latestStatus = await callSystemMethod<UpdateStatus>(method);
            setStatus(latestStatus);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : String(error));
        } finally {
            setRunningAction(null);
        }
    };

    const stateClasses = useMemo(() => {
        switch (status.state) {
            case 'succeeded':
            case 'up-to-date':
                return 'bg-green-100 text-green-800';
            case 'available':
            case 'checking':
            case 'updating':
                return 'bg-blue-100 text-blue-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            case 'unsupported':
                return 'bg-gray-200 text-gray-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    }, [status.state]);

    const busy = runningAction !== null || status.state === 'checking' || status.state === 'updating';

    return (
        <div className="rounded-lg border bg-gray-50 p-4 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h3 className="text-base font-semibold text-gray-900">Updates</h3>
                    <p className="text-sm text-gray-600">Check for new releases and trigger the systemd updater service.</p>
                </div>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${stateClasses}`}>
                    {formatState(status.state)}
                </span>
            </div>

            {loading ? (
                <p className="text-sm text-gray-600">Loading update status...</p>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md bg-white p-3 border">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Installed</p>
                        <p className="text-sm font-medium text-gray-900">{status.currentVersion ?? 'Unavailable'}</p>
                    </div>
                    <div className="rounded-md bg-white p-3 border">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Latest</p>
                        <p className="text-sm font-medium text-gray-900">{status.latestVersion ?? 'Unknown'}</p>
                    </div>
                    <div className="rounded-md bg-white p-3 border">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Last checked</p>
                        <p className="text-sm text-gray-900">{formatTimestamp(status.lastCheckedAt, settings.timezone)}</p>
                    </div>
                    <div className="rounded-md bg-white p-3 border">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Last completed</p>
                        <p className="text-sm text-gray-900">{formatTimestamp(status.lastCompletedAt, settings.timezone)}</p>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <p className="text-sm text-gray-700">{status.message ?? 'No update activity recorded yet.'}</p>
                {status.error && (
                    <p className="text-sm text-red-700">{status.error}</p>
                )}
                {actionError && (
                    <p className="text-sm text-red-700">{actionError}</p>
                )}
                {status.logPath && (
                    <p className="text-xs text-gray-500">Updater log: {status.logPath}</p>
                )}
                {!status.serviceAvailable && (
                    <p className="text-xs text-gray-500">The update service is not installed in this environment, so “Update now” is unavailable here.</p>
                )}
            </div>

            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => {
                        void handleAction('check');
                    }}
                    disabled={busy}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                        busy
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-white text-gray-700 border hover:bg-gray-100'
                    }`}
                >
                    <RefreshCw className="h-4 w-4" />
                    {runningAction === 'check' ? 'Checking...' : 'Check for updates'}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        void handleAction('update');
                    }}
                    disabled={busy || !status.serviceAvailable}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                        busy || !status.serviceAvailable
                            ? 'bg-blue-200 text-blue-100 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                    <Download className="h-4 w-4" />
                    {runningAction === 'update' ? 'Starting update...' : 'Update now'}
                </button>
            </div>
        </div>
    );
}
