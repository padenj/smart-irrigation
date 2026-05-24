import { BackendMethod, repo } from 'remult'
import { DisplayController } from './DisplayController';
import { WeatherController } from './WeatherController';
import { ProgramController } from './ProgramController';
import { ZoneController } from './ZoneController';
import { SensorController } from './SensorController';
import { HistoryController } from './HistoryController';
import { LogController } from './LogController';
import path from 'path';
import { SystemSettingsDto } from '../dto/SystemSettingsDto';
import { SystemStatusDto } from '../dto/SystemStatusDto';
import { SystemLog } from '../../shared/systemLog';
import type { SystemHealthSummary } from '../../shared/systemHealth';

export const systemStatusRepo = repo(SystemStatusDto);

export class SystemController {
    private static readonly HEALTH_CACHE_TTL_MS = 30 * 1000;
    private static cachedHealthSummary: { value: SystemHealthSummary; createdAtMs: number } | null = null;

    private static async updateLastRunDate() {
        try {
            const systemStatus = await systemStatusRepo.findFirst();
            if (!systemStatus) {
                console.error('SystemStatus not found');
                return;
            }

            await systemStatusRepo.update(0, { lastSchedulerRun: new Date() });
        } catch (error) {
            console.error('Failed to update systemStatus:', error);
        }
    }

    /**
     * Sets the completion status of all tasks.
     * @param {boolean} completed - The completion status to set for all tasks.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async run() {
        const systemSettings = await repo(SystemSettingsDto).findFirst();

        await SensorController.ReadSensorData();
        await SystemController.updateLastRunDate();
        DisplayController.setTime(systemSettings?.timezone|| 'UTC');
        await ProgramController.runNextScheduledProgram();

        return "Scheduler run initiated successfully";
    }

    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async init() {
        const systemSettings = await repo(SystemSettingsDto).findFirst();
        if (!systemSettings) {
            console.log('System settings not found, cannot initialize system');
            return "System settings not found";
        }
        await DisplayController.initialize();
        SensorController.initializeSensors(systemSettings);
       
        WeatherController.RetrieveWeather(true);
        DisplayController.setTime(systemSettings?.timezone|| 'UTC');
        ProgramController.stopActiveProgram();
        ZoneController.stopAllZones();
        try {
            const fs = await import('fs/promises');
            const version = await fs.readFile(path.join(process.cwd()+'/build/dist', 'version.txt'), 'utf-8');
            LogController.writeEvent(
                `Smart Irrigation version ${version.trim()} started`,
                "WARNING",
                'system',
                'system-init',
                { version: version.trim() }
            );
        } catch (error) {
            LogController.writeLog(`Error reading system version: ${error}`);
        }
        return "Initialization Completed Successfully";
    }


    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async update() {
        //console.log('Updating weather and statistics');
        await WeatherController.RetrieveWeather(false);
        await HistoryController.saveSnapshot();
        return "Update Completed Successfully";
    }

    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async daily() {
        ProgramController.recalculateAllSchedules();
        return "Daily tasks completed successfully";   
    }

    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async validateRelayState() {
        await ZoneController.reconcileRelayState();
        return "Relay state reconciliation completed successfully";
    }

    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async pruneRetention() {
        await HistoryController.pruneRetention();
        await LogController.pruneRetention();
        return 'Retention pruning completed successfully';
    }

    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async getHealthSummary(forceRefresh = false): Promise<SystemHealthSummary> {
        if (!forceRefresh && SystemController.cachedHealthSummary && Date.now() - SystemController.cachedHealthSummary.createdAtMs < SystemController.HEALTH_CACHE_TTL_MS) {
            return SystemController.cachedHealthSummary.value;
        }

        const systemStatus = await systemStatusRepo.findFirst();
        const logRepo = repo(SystemLog);
        const recentLogs = await logRepo.find({
            where: {
                timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { timestamp: 'desc' },
        });

        const schedulerAgeSeconds = systemStatus?.lastSchedulerRun
            ? Math.max(0, Math.round((Date.now() - new Date(systemStatus.lastSchedulerRun).getTime()) / 1000))
            : null;
        const activeZoneStartMs = systemStatus?.activeZoneStart ? new Date(systemStatus.activeZoneStart).getTime() : null;
        const activeZoneEndMs = systemStatus?.activeZoneEnd ? new Date(systemStatus.activeZoneEnd).getTime() : null;
        const activeZoneAgeSeconds = activeZoneStartMs ? Math.max(0, Math.round((Date.now() - activeZoneStartMs) / 1000)) : null;
        const activeZoneRemainingSeconds = activeZoneEndMs ? Math.round((activeZoneEndMs - Date.now()) / 1000) : null;
        const logWindow15Minutes = Date.now() - 15 * 60 * 1000;

        const storageMetrics = await SystemController.collectStorageMetrics();

        const summary: SystemHealthSummary = {
            generatedAt: new Date().toISOString(),
            scheduler: {
                isFresh: schedulerAgeSeconds !== null && schedulerAgeSeconds <= 45,
                ageSeconds: schedulerAgeSeconds,
                lastRun: systemStatus?.lastSchedulerRun ? new Date(systemStatus.lastSchedulerRun).toISOString() : null,
            },
            activeZone: {
                zoneName: systemStatus?.activeZone?.name ?? null,
                programName: systemStatus?.activeProgram?.name ?? null,
                startedAt: systemStatus?.activeZoneStart ?? null,
                endsAt: systemStatus?.activeZoneEnd ?? null,
                ageSeconds: activeZoneAgeSeconds,
                remainingSeconds: activeZoneRemainingSeconds,
                isOverdue: activeZoneRemainingSeconds !== null && activeZoneRemainingSeconds < 0,
            },
            logs: {
                warningsLast15Minutes: recentLogs.filter((log) => log.level === 'WARNING' && log.timestamp.getTime() >= logWindow15Minutes).length,
                errorsLast15Minutes: recentLogs.filter((log) => log.level === 'ERROR' && log.timestamp.getTime() >= logWindow15Minutes).length,
                divergencesLast24Hours: recentLogs.filter((log) => log.eventType === 'zone-divergence').length,
                reconciliationsLast24Hours: recentLogs.filter((log) => log.eventType === 'relay-reconciled').length,
                appLogEntries: await logRepo.count(),
            },
            disk: storageMetrics,
        };

        SystemController.cachedHealthSummary = {
            value: summary,
            createdAtMs: Date.now(),
        };

        return summary;
    }

    private static async collectStorageMetrics(): Promise<SystemHealthSummary['disk']> {
        const errors: string[] = [];
        const files: SystemHealthSummary['disk']['files'] = [];
        const dbPath = path.join(process.cwd(), 'db');

        const metric = {
            filesystemAvailableBytes: null as number | null,
            filesystemUsedBytes: null as number | null,
            filesystemTotalBytes: null as number | null,
            filesystemUsePercent: null as number | null,
            appDbSizeBytes: null as number | null,
            journalSizeBytes: null as number | null,
            files,
            errors,
        };

        try {
            const fs = await import('fs/promises');
            const statfs = await fs.statfs(process.cwd());
            const blockSize = Number(statfs.bsize);
            const totalBlocks = Number(statfs.blocks);
            const availableBlocks = Number(statfs.bavail);
            metric.filesystemTotalBytes = totalBlocks * blockSize;
            metric.filesystemAvailableBytes = availableBlocks * blockSize;
            metric.filesystemUsedBytes = metric.filesystemTotalBytes - metric.filesystemAvailableBytes;
            metric.filesystemUsePercent = metric.filesystemTotalBytes > 0
                ? Math.round((metric.filesystemUsedBytes / metric.filesystemTotalBytes) * 100)
                : null;

            const dbEntries = await fs.readdir(dbPath);
            let dbSizeBytes = 0;
            for (const entry of dbEntries) {
                const fullPath = path.join(dbPath, entry);
                const stats = await fs.stat(fullPath);
                if (!stats.isFile()) {
                    continue;
                }
                dbSizeBytes += stats.size;
                if (entry === 'systemLogs.json' || entry === 'systemStatusSnapshot.json') {
                    files.push({ path: fullPath, sizeBytes: stats.size });
                }
            }
            metric.appDbSizeBytes = dbSizeBytes;
        } catch (error) {
            errors.push(`storage probe failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            const { stdout } = await execAsync('journalctl --disk-usage');
            const match = stdout.match(/take up\s+([\d.]+)([KMGTP])B/i);
            if (match) {
                const size = parseFloat(match[1]);
                const units: Record<string, number> = {
                    K: 1024,
                    M: 1024 ** 2,
                    G: 1024 ** 3,
                    T: 1024 ** 4,
                    P: 1024 ** 5,
                };
                metric.journalSizeBytes = Math.round(size * units[match[2].toUpperCase()]);
            }
        } catch (error) {
            errors.push(`journal probe failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        return metric;
    }
}
