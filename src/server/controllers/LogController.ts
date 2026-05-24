import { remult } from 'remult';
import { LogDetails, LogEventType, LogLevel, LogSource, SystemLog } from '../../shared/systemLog';

type LogMetadata = {
    source?: LogSource;
    eventType?: LogEventType;
    details?: LogDetails | null;
};

export class LogController {
    private static readonly MAX_LOG_ENTRY_DETAILS_LENGTH = 2048;
    private static readonly MAX_LOG_ENTRIES = 2000;
    private static readonly MAX_LOG_AGE_DAYS = 30;

    static async writeLog(
        message: string,
        level: LogLevel = 'INFO',
        highlight = false,
        metadata: LogMetadata = {}
    ): Promise<void> {
        console.log(`${level} ${message}`);
        const logRepo = remult.repo(SystemLog);

        await logRepo.insert({
            message,
            level,
            timestamp: new Date(),
            highlight,
            source: metadata.source ?? null,
            eventType: metadata.eventType ?? null,
            details: LogController.sanitizeDetails(metadata.details),
        });
    }

    static async writeEvent(
        message: string,
        level: LogLevel,
        source: LogSource,
        eventType: LogEventType,
        details?: LogDetails | null,
        highlight = false
    ): Promise<void> {
        await LogController.writeLog(message, level, highlight, { source, eventType, details });
    }

    private static sanitizeDetails(details?: LogDetails | null): LogDetails | null {
        if (!details) {
            return null;
        }

        const serialized = JSON.stringify(details);
        if (serialized.length <= LogController.MAX_LOG_ENTRY_DETAILS_LENGTH) {
            return details;
        }

        return {
            truncated: true,
            preview: serialized.slice(0, LogController.MAX_LOG_ENTRY_DETAILS_LENGTH),
        };
    }

    static async pruneRetention(): Promise<void> {
        const logRepo = remult.repo(SystemLog);
        const cutoff = new Date(Date.now() - LogController.MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000);

        const expiredLogs = await logRepo.find({
            where: {
                timestamp: { $lt: cutoff },
            },
            orderBy: { timestamp: 'asc' },
            limit: 100,
        });

        for (const log of expiredLogs) {
            await logRepo.delete(log.id);
        }

        const totalLogs = await logRepo.count();
        const overflow = totalLogs - LogController.MAX_LOG_ENTRIES;
        if (overflow <= 0) {
            return;
        }

        const oldestLogs = await logRepo.find({
            orderBy: { timestamp: 'asc' },
            limit: Math.min(overflow, 100),
        });

        for (const log of oldestLogs) {
            await logRepo.delete(log.id);
        }
    }
}