import { BackendMethod, repo } from 'remult';
import { ValidPorts, Zone } from '../../shared/zones';
import { IRelayController } from '../types/hardware';
import { DisplayController } from './DisplayController';
import { DateTimeUtils } from '../utilities/DateTimeUtils'; // Adjust the path as needed
import { systemStatusRepo } from './SystemController';
import { LogController } from './LogController';
import { SystemSettings } from '../../shared/systemSettings';


export class ZoneController {
    static relays: IRelayController;

    @BackendMethod({ allowed: true, apiPrefix: 'zones' })
    static async stopAllZones() {
        const systemStatus = await systemStatusRepo.findFirst();
        if (systemStatus) {
            const activeZone = systemStatus.activeZone;
            if (activeZone) {
                console.log(`Stopping active zone: ${activeZone.name}`);
                LogController.writeLog(`Stopping active zone: ${activeZone.name}`, "INFO");
                ZoneController.stopZone(activeZone.id);
            }
        }

        DisplayController.setActiveZone();
        
        // Make sure all GPIO pins are turned off
        for (const pin of ValidPorts) {
            ZoneController.relays.turnOff(pin);
        }
    }

    @BackendMethod({ allowed: true, apiPrefix: 'zones' })
    static async runZone(zoneId: string, duration: number, isManual: boolean = false) {
        const zoneRepo = repo(Zone);
        const settings = await repo(SystemSettings).findFirst();
        if (!settings) {
            console.error('System settings not found');
            return;
        }
        const zoneDefinition = await zoneRepo.findId(zoneId);
        if (!zoneDefinition) {
            console.error(`Zone with ID ${zoneId} not found`);
            LogController.writeLog(`Zone with ID ${zoneId} not found`, "ERROR");
            return;
        }

        if (!zoneDefinition.enabled) {
            console.log(`Skipping disabled zone ${zoneDefinition.name}`);
            return;
        }

        // Set the active zone in the system status
        const now = new Date();
        const systemStatus = await systemStatusRepo.findFirst();
        if (!systemStatus) {
            console.error('System status not found');
            return;
        }
        await systemStatusRepo.update(0, { 
            activeZone: zoneDefinition, 
            activeZoneStart: DateTimeUtils.toISODateTime(now, settings.timezone), 
            activeZoneEnd: DateTimeUtils.toISODateTime(new Date(now.getTime() + duration * 1000), settings.timezone) 
        });

        if (isManual) {
        LogController.writeLog(`Manual - Running zone ${zoneDefinition.name} for ${duration} seconds`, "INFO", true);
        } else {
            LogController.writeLog(`Running zone ${zoneDefinition.name} for ${duration} seconds`);
        }
        DisplayController.setActiveZone(zoneDefinition.name, duration);
        // Enable the GPIO pin for the zone
        ZoneController.relays.turnOn(zoneDefinition.gpioPort);

        // Countdown timer to update the remaining duration every second
        for (let remainingDuration = duration; remainingDuration > 0; remainingDuration--) {
            if ((await systemStatusRepo.findFirst())?.activeZone?.id !== zoneId) {
                console.log(`Zone ${zoneDefinition.name} has been manually stopped or replaced. Aborting.`);
                LogController.writeLog(`Zone ${zoneDefinition.name} has been manually stopped`, "WARNING");
                break;
            }

            DisplayController.setActiveZone(zoneDefinition.name, remainingDuration);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Disable the GPIO pin for the zone
        ZoneController.stopZone(zoneId);
    }

    @BackendMethod({ allowed: true, apiPrefix: 'zones' })
    static async requestActiveZoneStop() {
        await systemStatusRepo.update(0, { activeZone: null });
    }

    /**
     * Stops a specific zone by turning off its relay.
     * @param zoneId - The ID of the zone to stop.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'zones' })
    static async stopZone(zoneId?: string) {
        const zoneRepo = repo(Zone);
        const activeZone = (await systemStatusRepo.findFirst())?.activeZone?.id;

        if (!zoneId && !activeZone) {
            console.error('No zone ID provided and no active zone found.');
            LogController.writeLog('No zone ID provided and no active zone found.', "ERROR");
            return "No zone ID provided and no active zone found.";
        }

        const zoneDefinition = await zoneRepo.findId(zoneId || activeZone || '');
        if (!zoneDefinition) {
            console.error(`Zone with ID ${zoneId} not found`);
            LogController.writeLog(`Zone with ID ${zoneId} not found`, "ERROR");
            return "Zone not found.";
        }

        // Turn off the GPIO pin for the zone
        ZoneController.relays.turnOff(zoneDefinition.gpioPort);
        DisplayController.setActiveZone();

        if (zoneId === activeZone) {
            // If the zone being stopped is the active zone, clear it
            await systemStatusRepo.update(0, { activeZone: null });
        }

        console.log(`Zone ${zoneId} stopped successfully.`);
        // LogController.writeLog(`Zone ${zoneDefinition.name} stopped successfully.`);
        return `Zone ${zoneId} stopped successfully.`;
    }


}
