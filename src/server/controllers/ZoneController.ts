import { BackendMethod, repo } from 'remult';
import { Zone } from '../../shared/zones';
import { IRelayController } from '../types/hardware';
import { DisplayController } from './DisplayController';
import { systemStatusRepo } from './SystemController';
import { LogController } from './LogController';


export class ZoneController {
    static relays: IRelayController;

    @BackendMethod({ allowed: true, apiPrefix: 'zones' })
    static async runZone(zoneId: string, duration: number) {
        const zoneRepo = repo(Zone);

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
        await systemStatusRepo.update(0, { activeZone: zoneDefinition });
        LogController.writeLog(`Running zone ${zoneDefinition.name} for ${duration} seconds`);
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
        LogController.writeLog(`Zone ${zoneDefinition.name} stopped successfully.`);
        return `Zone ${zoneId} stopped successfully.`;
    }


}
