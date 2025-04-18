import { BackendMethod, repo } from 'remult'
import { SystemStatus } from '../../shared/systemStatus'
import { SystemSettings } from '../../shared/systemSettings';
import { DisplayController } from './DisplayController';
import { WeatherController } from './WeatherController';
import { ProgramController } from './ProgramController';
import { ZoneController } from './ZoneController';

export const systemStatusRepo = repo(SystemStatus);

export class SystemController {
    private static UpdateLastRunDate() {
        systemStatusRepo.findFirst().then((systemStatus) => {
            if (systemStatus) {
                systemStatusRepo.update(0, { ...systemStatus, lastSchedulerRun: new Date() }).catch((error) => {
                    console.error('Failed to update systemStatus:', error);
                });
            } else {
                console.error('SystemStatus not found');
            }
        }).catch((error) => {
            console.error('Failed to fetch systemStatus:', error);
        });
    }

    /**
     * Sets the completion status of all tasks.
     * @param {boolean} completed - The completion status to set for all tasks.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async run() {
        const systemSettings = await repo(SystemSettings).findFirst();

        SystemController.UpdateLastRunDate();
        DisplayController.setTime(systemSettings?.timezone|| 'UTC');
        ProgramController.runNextScheduledProgram();
        return "Scheduler run initiated successfully";
    }

    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async init() {
        const systemSettings = await repo(SystemSettings).findFirst();
        WeatherController.RetrieveWeather(true);
        DisplayController.setTime(systemSettings?.timezone|| 'UTC');
        ProgramController.stopActiveProgram();
        ZoneController.stopAllZones();
        
        return "Initialization Completed Successfully";
    }


    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async update() {
        console.log('Updating weather and statistics');
        WeatherController.RetrieveWeather(false);
        return "Update Completed Successfully";
    }

    @BackendMethod({ allowed: true, apiPrefix: 'system' })
    static async daily() {
        ProgramController.recalculateAllSchedules();
        return "Daily tasks completed successfully";   
    }
}
