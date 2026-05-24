import { BackendMethod, repo } from "remult";
import { SystemStatusSnapshot } from "../../shared/systemStatus.js";
import { DateTimeUtils } from "../utilities/DateTimeUtils.js";
import { SystemSettingsDto } from "../dto/SystemSettingsDto.js";
import { SystemStatusDto } from "../dto/SystemStatusDto.js";


export class HistoryController {
    private static readonly MAX_SNAPSHOTS = 5000;
    private static readonly MAX_SNAPSHOT_AGE_DAYS = 30;

    /**
     * Saves a snapshot of the current system status to the database.
     * @param systemStatus The current system status object to snapshot.
     * @param remultInstance Optional Remult instance for dependency injection/testing.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'history' })
    static async saveSnapshot() {
        const snapshotRepo = repo(SystemStatusSnapshot);
        const settingsRepo = repo(SystemSettingsDto);
        const systemStatusRepo = repo(SystemStatusDto);

        const settings = await settingsRepo.findFirst();
        if (!settings) {
            console.error('System settings not found');
            return;
        }

        const systemStatus = await systemStatusRepo.findFirst();
        if (!systemStatus) {
            console.error('System status not found');
            return;
        }

        const snapshotFrequency = settings.historySnapshotInterval || 15; // Default to 15 minutes if not set

        const lastSnapshot = await snapshotRepo.find({
            orderBy: { timestamp: "desc" },
            limit: 1,
        });
        if (lastSnapshot.length > 0) {
            const lastTimestamp = DateTimeUtils.fromISODateTime(lastSnapshot[0].timestamp, settings.timezone);
            if (lastTimestamp) {
                const now = new Date();
                const diffMinutes = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60);
                if (diffMinutes < snapshotFrequency) {
                    return null;
                }
            }
        }

        //console.log('Saving system status snapshot');
        const snapshot = snapshotRepo.create({
            timestamp: DateTimeUtils.toISODateTime(new Date(), settings.timezone) ?? "",
            systemStatus: JSON.parse(JSON.stringify(systemStatus)), // deep copy
        });

        await snapshotRepo.save(snapshot);
        return snapshot;
    }

    static async pruneRetention(): Promise<void> {
        const snapshotRepo = repo(SystemStatusSnapshot);
        const cutoff = DateTimeUtils.toISODateTime(
            new Date(Date.now() - HistoryController.MAX_SNAPSHOT_AGE_DAYS * 24 * 60 * 60 * 1000),
            'UTC'
        ) ?? '';

        const expiredSnapshots = await snapshotRepo.find({
            where: {
                timestamp: { $lt: cutoff },
            },
            orderBy: { timestamp: 'asc' },
            limit: 25,
        });

        for (const snapshot of expiredSnapshots) {
            await snapshotRepo.delete(snapshot.id);
        }

        const totalSnapshots = await snapshotRepo.count();
        const overflow = totalSnapshots - HistoryController.MAX_SNAPSHOTS;
        if (overflow <= 0) {
            return;
        }

        const oldestSnapshots = await snapshotRepo.find({
            orderBy: { timestamp: 'asc' },
            limit: Math.min(overflow, 25),
        });

        for (const snapshot of oldestSnapshots) {
            await snapshotRepo.delete(snapshot.id);
        }
    }
}
