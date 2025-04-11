import { BackendMethod, repo } from 'remult'
import { SystemStatus } from '../shared/systemStatus'
import { Program } from '../shared/programs';
import { Zone } from '../shared/zones'; // Assuming Zones is defined in this path
import { ILCDManager, IRelayController, ISensorController } from './hardwareControllers';
import { SystemSettings } from '../shared/systemSettings';
import { DateTime } from 'luxon';

const systemStatusRepo = repo(SystemStatus);

export class DateTimeUtils {
    static toISODateTime(date:Date, timezone: string|null): string | null {
        if (!date) return null;
        return DateTime.fromJSDate(date).setZone(timezone|| 'UTC').toISO();
    }

    static fromISODateTime(dateString: string|null, timezone: string|null): Date | null {
        if (!dateString) return null;
        const dateTime = DateTime.fromISO(dateString, { zone: timezone|| 'UTC' });
        return dateTime.toJSDate();
    }

    static toReadableDateTime(date: Date, timezone: string|null): string {
        if (!date) return '';
        const dateTime = DateTime.fromJSDate(date).setZone(timezone|| 'UTC');
        return dateTime.toFormat('yyyy-MM-dd hh:mm a ZZZ');
    }

    static isoToDateTimeShortStr(dateString: string|null, timezone: string|null): string {
        if (!dateString) return '';
        const dateTime = DateTime.fromISO(dateString, { zone: timezone|| 'UTC' });
        return dateTime.toFormat('MM/dd/yy hh:mm a');
    }

    static toDateTimeShortStr(date: Date, timezone: string|null): string {
        if (!date) return '';
        const dateTime = DateTime.fromJSDate(date).setZone(timezone|| 'UTC');
        return dateTime.toFormat('MM/dd/yy hh:mm a');
    }
}

export class DisplayController {
    static lcdManager: ILCDManager;

    static setTime (timezone: string) {
        DisplayController.insertText(0, 0, 0, DateTimeUtils.toDateTimeShortStr(new Date(), timezone));
    }

    static setActiveProgram(programName?: string) {
        if (!programName) {
            programName = 'None Active';
        }
        const programText = `Program: ${programName.slice(0, 15)}`;
        DisplayController.insertText(0, 1, 0, programText);
    }

    static setActiveZone (zoneName?: string, duration?: number) {
        if (!zoneName) {
            zoneName = 'None Active';
        }
        const zoneText = `Zone: ${zoneName.slice(0, 15)} ${duration ? `(${duration}s)` : ''}`;
        DisplayController.insertText(0, 2, 0, zoneText);
    }

    static async writeLine(pageIndex: number, lineIndex: number, text: string) {
        if (this.lcdManager) {
            this.lcdManager.writeLine(pageIndex, lineIndex, text);
        } else {
            console.error('LCD Manager is not initialized');
        }
    }
    static async insertText(pageIndex: number, lineIndex: number, position: number, text: string) {
        if (this.lcdManager) {
            this.lcdManager.insertText(pageIndex, lineIndex, position, text);
        } else {
            console.error('LCD Manager is not initialized');
        }
    }
}

export class SystemController {
    static relays: IRelayController;
    static lcdManager: ILCDManager;
    static sensorController: ISensorController;

    /**
     * Calculates the next scheduled run date for each program.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'scheduler' })
    static async calculateProgramSchedule(programId: string, skipToday?: boolean) {

        const programRepo = repo(Program);
        const program = await programRepo.findId(programId);
        if (!program) {
            console.error(`Program with ID ${programId} not found`);
            return "Program not found.";
        }
        const settings = await repo(SystemSettings).findFirst();
        const timezone = settings?.timezone || 'UTC';
        console.log(`Calculating schedule for program ${program.name} in timezone ${timezone}`);

        const getNextRunDate = (daysOfWeek: number[], startTime: string, lastRunDate: Date | null): Date | null => {
            if (!daysOfWeek || daysOfWeek.length === 0) {
                console.log('No days of the week provided');
                return null;
            }
            const [hours, minutes] = startTime.split(':').map(Number);
            const now = DateTime.now().setZone(timezone);
            const todayDayOfWeek = now.weekday % 7; // Convert Luxon's weekday (1-7) to JS's (0-6)
            const sortedDaysOfWeek = [...daysOfWeek].sort((a, b) => a - b);

            let nextRunDate: Date | null = null;

            for (let i = 0; i < sortedDaysOfWeek.length; i++) {
                const dayOfWeek = sortedDaysOfWeek[(i + sortedDaysOfWeek.indexOf(todayDayOfWeek) + (skipToday ? 1 : 0)) % sortedDaysOfWeek.length];

                console.log(`Checking dayOfWeek: ${dayOfWeek}, todayDayOfWeek: ${todayDayOfWeek}`);
                let candidateDate = now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
                console.log(`Candidate date before adjustment: ${candidateDate.toString()}`);
                if (dayOfWeek >= todayDayOfWeek) {
                    // If the dayOfWeek is today (and skipToday is false) or later this week
                    candidateDate = candidateDate.plus({ days: dayOfWeek - todayDayOfWeek });
                } else {
                    // If the dayOfWeek is earlier in the week, jump to next week
                    candidateDate = candidateDate.plus({ days: 7 - todayDayOfWeek + dayOfWeek });
                }

                if (candidateDate >= now && (!lastRunDate || candidateDate.toJSDate() > lastRunDate)) {
                    nextRunDate = candidateDate.toJSDate();
                    break;
                }
            }

            if (!nextRunDate) {
            // If no valid date was found this week, jump to the next occurrence in the next week
            const firstDayOfWeek = sortedDaysOfWeek[0];
            const candidateDate = now
                .plus({ days: 7 - todayDayOfWeek + firstDayOfWeek })
                .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

            if (!lastRunDate || candidateDate.toJSDate() > lastRunDate) {
                nextRunDate = candidateDate.toJSDate();
            }
            }

            return nextRunDate;
        };

        const { lastRunTime, daysOfWeek, startTime } = program;
        const lastRunDate = lastRunTime ? DateTimeUtils.fromISODateTime(lastRunTime, timezone) : null;
        const nextRunDate = getNextRunDate(daysOfWeek, startTime, lastRunDate);
        
        if (nextRunDate) {
            await programRepo.update(program.id, { nextScheduledRunTime: DateTimeUtils.toISODateTime(nextRunDate, timezone) });
        } else {
            await programRepo.update(program.id, { nextScheduledRunTime: null });
        }
   
        return "Next scheduled run dates calculated successfully";
    }

    @BackendMethod({ allowed: true, apiPrefix: 'scheduler' })
    static async recalculateAllSchedules () {
        const programRepo = repo(Program);
        const programs = await programRepo.find();

        for (const program of programs) {
            this.calculateProgramSchedule(program.id);
        }
    }

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
     * Checks for the next program to run and triggers it if necessary.
     */
    static async checkAndRunNextProgram() {
        const programRepo = repo(Program);
        const programs = await programRepo.find();
        const settings = await repo(SystemSettings).findFirst();
        const timezone = settings?.timezone || 'UTC';
        const now = new Date();

        const systemStatus = await systemStatusRepo.findFirst();
        if (systemStatus?.activeProgram) {
            console.log('An active program is already running. Exiting function.');
            return;
        }

        const programToRun = programs.find((program) => {
            if (!program.isEnabled) {
                console.log(`Skipping disabled program ${program.name}`);
                return false;
            }
            if (program.nextScheduledRunTime) {
                const nextRunTime = DateTimeUtils.fromISODateTime(program.nextScheduledRunTime, timezone);
                return nextRunTime ? nextRunTime <= now : false;
            }
            return false;
        });
        
        if (programToRun) {
            console.log(`Running program ${programToRun.name}`);
            // Trigger the program run in the background
            SystemController.runProgram(programToRun.id);
        }
    }

    @BackendMethod({ allowed: true, apiPrefix: 'scheduler' })
    static async runZone(zoneId: string, duration: number) {
        const zoneRepo = repo(Zone);

        const zoneDefinition = await zoneRepo.findId(zoneId);
        if (!zoneDefinition) {
            console.error(`Zone with ID ${zoneId} not found`);
            return;
        }

        if (!zoneDefinition.enabled) {
            console.log(`Skipping disabled zone ${zoneDefinition.name}`);
            return;
        }

        // Set the active zone in the system status
        await systemStatusRepo.update(0, { activeZone: zoneDefinition });

        DisplayController.setActiveZone(zoneDefinition.name, duration);
        // Enable the GPIO pin for the zone
        SystemController.relays.turnOn(zoneDefinition.gpioPort);

        // Countdown timer to update the remaining duration every second
        for (let remainingDuration = duration; remainingDuration > 0; remainingDuration--) {
            if ((await systemStatusRepo.findFirst())?.activeZone?.id !== zoneId) {
                console.log(`Zone ${zoneId} has been manually stopped or replaced. Aborting.`);
                break;
            }

            DisplayController.setActiveZone(zoneDefinition.name, remainingDuration);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Disable the GPIO pin for the zone
        SystemController.stopZone(zoneId);
    }

    @BackendMethod({ allowed: true, apiPrefix: 'scheduler' })
    static async requestActiveZoneStop() {
        await systemStatusRepo.update(0, { activeZone: null });
    }

    /**
     * Stops a specific zone by turning off its relay.
     * @param zoneId - The ID of the zone to stop.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'scheduler' })
    static async stopZone(zoneId?: string) {
        const zoneRepo = repo(Zone);
        const activeZone = (await systemStatusRepo.findFirst())?.activeZone?.id;

        if (!zoneId && !activeZone) {
            console.error('No zone ID provided and no active zone found.');
            return "No zone ID provided and no active zone found.";
        }

        const zoneDefinition = await zoneRepo.findId(zoneId || activeZone || '');
        if (!zoneDefinition) {
            console.error(`Zone with ID ${zoneId} not found`);
            return "Zone not found.";
        }

        // Turn off the GPIO pin for the zone
        SystemController.relays.turnOff(zoneDefinition.gpioPort);
        DisplayController.setActiveZone();

        if (zoneId === activeZone) {
            // If the zone being stopped is the active zone, clear it
            await systemStatusRepo.update(0, { activeZone: null });
        }   
        
        console.log(`Zone ${zoneId} stopped successfully.`);
        return `Zone ${zoneId} stopped successfully.`;
    }

    /**
     * Runs a program by iterating through its zones and activating relays.
     * @param programId - The ID of the program to run.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'scheduler' })
    static async runProgram(programId: string) {
        const programRepo = repo(Program);
        const systemStatus = await systemStatusRepo.findFirst();
        const settings = await repo(SystemSettings).findFirst();
        const timezone = settings?.timezone || 'UTC';

        const program = await programRepo.findId(programId);
        if (!program) {
            console.error(`Program with ID ${programId} not found`);
            return;
        }

        // Calculate the next scheduled run date for the program
        SystemController.calculateProgramSchedule(programId, true);

        console.log(`Running program ${program.name}`);

        // Set the active program in the system status
        if (systemStatus) {
            await systemStatusRepo.update(systemStatus.id, { activeProgram: program });
        }

        // Update program's lastRunTime
        await programRepo.update(program.id, {
            lastRunTime: DateTimeUtils.toISODateTime(new Date(), timezone)
        });

        for (const zone of program.zones) {
            // Check if the program is still the active program
            const currentSystemStatus = await systemStatusRepo.findFirst();
       
            if (!currentSystemStatus || currentSystemStatus.activeProgram?.id !== program.id) {
                console.log(`Program ${program.name} has been manually stopped or replaced. Aborting.`);
                break;
            }
            await SystemController.runZone(zone.zoneId, zone.duration);
        }

        // Clear the active program in the system status
        if (systemStatus) {
            await systemStatusRepo.update(systemStatus.id, { activeProgram: null });
        }
    }

    /**
     * Stops the currently active program by clearing the activeProgram in systemStatus
     * and turning off all zone relays one at a time.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'scheduler' })
    static async stopActiveProgram() {
        const systemStatus = await systemStatusRepo.findFirst();
        if (!systemStatus || !systemStatus.activeProgram) {
            console.log('No active program to stop.');
            return "No active program to stop.";
        }

        const program = systemStatus.activeProgram;

        // Iterate through the zones of the active program and turn them off
        for (const zone of program.zones) {
            SystemController.stopZone(zone.zoneId);
        }

        // Clear the active program and zone in the system status
        await systemStatusRepo.update(0, { activeProgram: null, activeZone: null });
        
        console.log('Active program stopped and all zones turned off.');
        return "Active program stopped successfully.";
    }

    /**
     * Sets the completion status of all tasks.
     * @param {boolean} completed - The completion status to set for all tasks.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'scheduler' })
    static async run() {
        const systemSettings = await repo(SystemSettings).findFirst();

        SystemController.UpdateLastRunDate();
        DisplayController.setTime(systemSettings?.timezone|| 'UTC');
        SystemController.checkAndRunNextProgram();
        return "Scheduler run initiated successfully";
    }
}
