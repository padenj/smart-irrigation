import { BackendMethod, repo } from "remult";
import { SystemStatus, SystemStatusSnapshot } from "../../shared/systemStatus.js";
import { SystemSettings } from "../../shared/systemSettings.js";
import { DateTimeUtils } from "../utilities/DateTimeUtils.js";


export class HistoryController {
    /**
     * Saves a snapshot of the current system status to the database.
     * @param systemStatus The current system status object to snapshot.
     * @param remultInstance Optional Remult instance for dependency injection/testing.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'history' })
    static async saveSnapshot() {
        const snapshotRepo = repo(SystemStatusSnapshot);
        const settingsRepo = repo(SystemSettings);
        const systemStatusRepo = repo(SystemStatus);

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

        console.log('Saving system status snapshot');
        const snapshot = snapshotRepo.create({
            timestamp: DateTimeUtils.toISODateTime(new Date(), settings.timezone) ?? "",
            systemStatus: JSON.parse(JSON.stringify(systemStatus)), // deep copy
        });

        await snapshotRepo.save(snapshot);
        return snapshot;
    }
}