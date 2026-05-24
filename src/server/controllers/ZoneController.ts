import { BackendMethod, repo } from 'remult';
import { ValidPorts, Zone } from '../../shared/zones';
import { IRelayController } from '../types/hardware';
import { DisplayController } from './DisplayController';
import { DateTimeUtils } from '../utilities/DateTimeUtils'; // Adjust the path as needed
import { systemStatusRepo } from './SystemController';
import { LogController } from './LogController';
import { SystemSettingsDto } from '../dto/SystemSettingsDto';

type ZoneRunContext = {
    zoneDefinition: Zone;
    timezone: string;
    duration: number;
    zoneId: string;
    isManual: boolean;
    endTimeMs: number;
};

type ActiveZoneRun = {
    context: ZoneRunContext;
    stopRequested: boolean;
};

export class ZoneController {
    static relays: IRelayController;
    private static activeZoneRuns = new Map<string, ActiveZoneRun>();

    private static registerZoneRun(context: ZoneRunContext): void {
        ZoneController.activeZoneRuns.set(context.zoneId, { context, stopRequested: false });
    }

    private static getZoneRunState(context: ZoneRunContext): ActiveZoneRun | null {
        const zoneRun = ZoneController.activeZoneRuns.get(context.zoneId);
        return zoneRun?.context === context ? zoneRun : null;
    }

    private static requestZoneRunStop(zoneId?: string): void {
        if (!zoneId) {
            return;
        }

        const zoneRun = ZoneController.activeZoneRuns.get(zoneId);
        if (zoneRun) {
            zoneRun.stopRequested = true;
        }
    }

    private static clearZoneRun(context: ZoneRunContext): void {
        const zoneRun = ZoneController.activeZoneRuns.get(context.zoneId);
        if (zoneRun?.context === context) {
            ZoneController.activeZoneRuns.delete(context.zoneId);
        }
    }

    private static forceRelayOff(zoneDefinition: Zone): void {
        ZoneController.relays.turnOff(zoneDefinition.gpioPort);
    }

    private static async createZoneRunContext(
        zoneId: string,
        duration: number,
        isManual: boolean
    ): Promise<ZoneRunContext | null> {
        const zoneRepo = repo(Zone);
        const [settings, zoneDefinition, systemStatus] = await Promise.all([
            repo(SystemSettingsDto).findFirst(),
            zoneRepo.findId(zoneId),
            systemStatusRepo.findFirst(),
        ]);

        if (!settings) {
            console.error('System settings not found');
            return null;
        }

        if (!zoneDefinition) {
            console.error(`Zone with ID ${zoneId} not found`);
            await LogController.writeLog(`Zone with ID ${zoneId} not found`, "ERROR");
            return null;
        }

        if (!zoneDefinition.enabled) {
            console.log(`Skipping disabled zone ${zoneDefinition.name}`);
            return null;
        }

        if (!systemStatus) {
            console.error('System status not found');
            return null;
        }

        return {
            zoneDefinition,
            timezone: settings.timezone,
            duration,
            zoneId,
            isManual,
            endTimeMs: 0,
        };
    }

    private static async activateZoneRun(context: ZoneRunContext): Promise<void> {
        const now = new Date();
        context.endTimeMs = now.getTime() + context.duration * 1000;

        await systemStatusRepo.update(0, {
            activeZone: context.zoneDefinition,
            activeZoneStart: DateTimeUtils.toISODateTime(now, context.timezone),
            activeZoneEnd: DateTimeUtils.toISODateTime(new Date(context.endTimeMs), context.timezone),
        });

        ZoneController.relays.turnOn(context.zoneDefinition.gpioPort);
        ZoneController.registerZoneRun(context);

        if (context.isManual) {
            void LogController.writeLog(
                `Manual - Running zone ${context.zoneDefinition.name} for ${context.duration} seconds`,
                "INFO",
                true
            ).catch((error) => {
                console.error('Failed to write manual zone start log:', error);
            });
        } else {
            void LogController.writeLog(`Running zone ${context.zoneDefinition.name} for ${context.duration} seconds`).catch((error) => {
                console.error('Failed to write zone start log:', error);
            });
        }

        void DisplayController.setActiveZone(context.zoneDefinition.name, context.duration).catch((error) => {
            console.error('Failed to update display with active zone:', error);
        });
    }

    private static async monitorZoneRun(context: ZoneRunContext): Promise<void> {
        let lastDisplayedSeconds: number | null = null;

        try {
            while (true) {
                const zoneRun = ZoneController.getZoneRunState(context);
                if (zoneRun?.stopRequested) {
                    return;
                }

                const currentSystemStatus = await systemStatusRepo.findFirst();
                if (ZoneController.getZoneRunState(context)?.stopRequested) {
                    return;
                }

                if (currentSystemStatus?.activeZone?.id !== context.zoneId) {
                    ZoneController.forceRelayOff(context.zoneDefinition);

                    const replacementZoneName = currentSystemStatus?.activeZone?.name;
                    const mismatchMessage = replacementZoneName
                        ? `Zone ${context.zoneDefinition.name} lost control to ${replacementZoneName}. Relay was forced off.`
                        : `Zone ${context.zoneDefinition.name} lost active status unexpectedly. Relay was forced off.`;

                    console.log(mismatchMessage);
                    await LogController.writeLog(mismatchMessage, "WARNING");
                    return;
                }

                const remainingMs = context.endTimeMs - Date.now();
                if (remainingMs <= 0) {
                    break;
                }

                const remainingSeconds = Math.ceil(remainingMs / 1000);
                if (remainingSeconds !== lastDisplayedSeconds) {
                    lastDisplayedSeconds = remainingSeconds;
                    void DisplayController.setActiveZone(context.zoneDefinition.name, remainingSeconds).catch((error) => {
                        console.error('Failed to update active zone countdown:', error);
                    });
                }

                const msUntilNextSecond = remainingMs - (remainingSeconds - 1) * 1000;
                await new Promise((resolve) => setTimeout(resolve, Math.max(1, Math.min(msUntilNextSecond, remainingMs))));
            }

            await ZoneController.stopZone(context.zoneId);
        } finally {
            ZoneController.clearZoneRun(context);
        }
    }

    static async runZoneBlocking(zoneId: string, duration: number, isManual: boolean = false) {
        const context = await ZoneController.createZoneRunContext(zoneId, duration, isManual);
        if (!context) {
            return;
        }

        await ZoneController.activateZoneRun(context);
        await ZoneController.monitorZoneRun(context);
    }

    @BackendMethod({ allowed: true, apiPrefix: 'zones' })
    static async stopAllZones() {
        const systemStatus = await systemStatusRepo.findFirst();
        for (const zoneRun of ZoneController.activeZoneRuns.values()) {
            zoneRun.stopRequested = true;
        }

        if (systemStatus) {
            const activeZone = systemStatus.activeZone;
            if (activeZone) {
                console.log(`Stopping active zone: ${activeZone.name}`);
                LogController.writeLog(`Stopping active zone: ${activeZone.name}`, "INFO");
                await ZoneController.stopZone(activeZone.id);
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
        const context = await ZoneController.createZoneRunContext(zoneId, duration, isManual);
        if (!context) {
            return;
        }

        await ZoneController.activateZoneRun(context);

        void ZoneController.monitorZoneRun(context).catch(async (error) => {
            console.error(`Zone run failed for ${context.zoneDefinition.name}:`, error);
            await ZoneController.stopZone(zoneId).catch((stopError) => {
                console.error(`Failed to stop zone ${context.zoneDefinition.name} after run error:`, stopError);
            });
        });

        return `Zone ${context.zoneDefinition.name} started successfully.`;
    }

    @BackendMethod({ allowed: true, apiPrefix: 'zones' })
    static async requestActiveZoneStop() {
        const activeZoneId = (await systemStatusRepo.findFirst())?.activeZone?.id;
        if (!activeZoneId) {
            return "No active zone to stop.";
        }

        return ZoneController.stopZone(activeZoneId);
    }

    /**
     * Stops a specific zone by turning off its relay.
     * @param zoneId - The ID of the zone to stop.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'zones' })
    static async stopZone(zoneId?: string) {
        const zoneRepo = repo(Zone);
        const activeZone = (await systemStatusRepo.findFirst())?.activeZone?.id;
        ZoneController.requestZoneRunStop(zoneId || activeZone);

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
            await systemStatusRepo.update(0, {
                activeZone: null,
                activeZoneStart: null,
                activeZoneEnd: null,
            });
        }

        console.log(`Zone ${zoneId} stopped successfully.`);
        // LogController.writeLog(`Zone ${zoneDefinition.name} stopped successfully.`);
        return `Zone ${zoneId} stopped successfully.`;
    }

    @BackendMethod({ allowed: true, apiPrefix: 'zones' })
    static async reconcileRelayState() {
        const [systemStatus, settings] = await Promise.all([
            systemStatusRepo.findFirst(),
            repo(SystemSettingsDto).findFirst(),
        ]);

        const timezone = settings?.timezone || 'UTC';
        const activeZoneEnd = systemStatus?.activeZoneEnd
            ? DateTimeUtils.fromISODateTime(systemStatus.activeZoneEnd, timezone)
            : null;
        const hasExpiredActiveZone = Boolean(
            systemStatus?.activeZone &&
            activeZoneEnd &&
            activeZoneEnd.getTime() <= Date.now()
        );

        if (hasExpiredActiveZone && systemStatus?.activeZone) {
            await LogController.writeLog(
                `Active zone ${systemStatus.activeZone.name} exceeded its scheduled end time. Forcing the relay off.`,
                "WARNING"
            );
            await ZoneController.stopZone(systemStatus.activeZone.id);
        }

        const refreshedSystemStatus = await systemStatusRepo.findFirst();
        const expectedActivePort = refreshedSystemStatus?.activeZone?.gpioPort ?? null;

        for (const pin of ValidPorts) {
            if (pin === expectedActivePort) {
                ZoneController.relays.turnOn(pin);
            } else {
                ZoneController.relays.turnOff(pin);
            }
        }

        if (!expectedActivePort) {
            void DisplayController.setActiveZone().catch((error) => {
                console.error('Failed to clear active zone display during relay reconciliation:', error);
            });
        }
    }


}
