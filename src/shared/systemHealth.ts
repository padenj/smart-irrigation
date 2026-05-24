export interface SchedulerHealth {
    isFresh: boolean;
    ageSeconds: number | null;
    lastRun: string | null;
}

export interface ActiveZoneHealth {
    zoneName: string | null;
    programName: string | null;
    startedAt: string | null;
    endsAt: string | null;
    ageSeconds: number | null;
    remainingSeconds: number | null;
    isOverdue: boolean;
}

export interface LogHealth {
    warningsLast15Minutes: number;
    errorsLast15Minutes: number;
    divergencesLast24Hours: number;
    reconciliationsLast24Hours: number;
    appLogEntries: number;
}

export interface FileSizeHealth {
    path: string;
    sizeBytes: number;
}

export interface DiskHealth {
    filesystemAvailableBytes: number | null;
    filesystemUsedBytes: number | null;
    filesystemTotalBytes: number | null;
    filesystemUsePercent: number | null;
    appDbSizeBytes: number | null;
    journalSizeBytes: number | null;
    files: FileSizeHealth[];
    errors: string[];
}

export interface SystemHealthSummary {
    generatedAt: string;
    scheduler: SchedulerHealth;
    activeZone: ActiveZoneHealth;
    logs: LogHealth;
    disk: DiskHealth;
}
