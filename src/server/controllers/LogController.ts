import { remult } from 'remult';
import { SystemLog } from '../../shared/systemLog';

export class LogController {
    static async writeLog(message: string, level?: 'INFO' | 'WARNING' | 'ERROR'): Promise<void> {
        if (!level) {
            level = 'INFO';
        }
        console.log(`${level} ${message}`);
        const logRepo = remult.repo(SystemLog);

        await logRepo.insert({ message, level, timestamp: new Date() });
    }
}