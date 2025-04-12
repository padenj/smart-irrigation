import { DateTime } from 'luxon';
import { BackendMethod, repo } from 'remult';
import { Program } from '../../shared/programs';
import { SystemSettings } from '../../shared/systemSettings';
import { DateTimeUtils } from '../utilities/DateTimeUtils';
import { systemStatusRepo } from './SystemController';
import { ZoneController } from './ZoneController';
import { LogController } from './LogController';
import { DisplayController } from './DisplayController';


export class ProgramController {
    /**
     * Calculates the next scheduled run date for each program.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'programs' })
    static async calculateProgramSchedule(programId: string, skipToday?: boolean) {

        const programRepo = repo(Program);
        const program = await programRepo.findId(programId);
        if (!program) {
            console.error(`Program with ID ${programId} not found`);
            LogController.writeLog(`Program with ID ${programId} not found in Schedule Calculation`, "ERROR");
            return "Program not found.";
        }
        const settings = await repo(SystemSettings).findFirst();
        const timezone = settings?.timezone || 'UTC';
        //console.log(`Calculating schedule for program ${program.name} in timezone ${timezone}`);

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

                //console.log(`Checking dayOfWeek: ${dayOfWeek}, todayDayOfWeek: ${todayDayOfWeek}`);
                let candidateDate = now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
               // console.log(`Candidate date before adjustment: ${candidateDate.toString()}`);
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

    @BackendMethod({ allowed: true, apiPrefix: 'programs' })
    static async recalculateAllSchedules() {
        const programRepo = repo(Program);
        const programs = await programRepo.find();

        for (const program of programs) {
            this.calculateProgramSchedule(program.id);
        }
    }

    /**
    * Runs a program by iterating through its zones and activating relays.
    * @param programId - The ID of the program to run.
    */
    @BackendMethod({ allowed: true, apiPrefix: 'programs' })
    static async runProgram(programId: string) {
        const programRepo = repo(Program);
        const systemStatus = await systemStatusRepo.findFirst();
        const settings = await repo(SystemSettings).findFirst();
        const timezone = settings?.timezone || 'UTC';

        const program = await programRepo.findId(programId);
        if (!program) {
            console.error(`Program with ID ${programId} not found`);
            LogController.writeLog(`Program with ID ${programId} not found`, "ERROR");
            return;
        }

        // Calculate the next scheduled run date for the program
        ProgramController.calculateProgramSchedule(programId, true);
        LogController.writeLog(`Running program ${program.name}`);
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
                LogController.writeLog(`Program ${program.name} has been manually stopped`, "WARNING");
                break;
            }
            await ZoneController.runZone(zone.zoneId, zone.duration);
        }

        LogController.writeLog(`Program ${program.name} completed`);
        // Clear the active program in the system status
        if (systemStatus) {
            await systemStatusRepo.update(systemStatus.id, { activeProgram: null });
        }
    }

    /**
     * Checks for the next program to run and triggers it if necessary.
     */
    static async runNextScheduledProgram() {
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
            ProgramController.runProgram(programToRun.id);
        }
    }


    /**
     * Stops the currently active program by clearing the activeProgram in systemStatus
     * and turning off all zone relays one at a time.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'programs' })
    static async stopActiveProgram() {
        const systemStatus = await systemStatusRepo.findFirst();
        if (!systemStatus || !systemStatus.activeProgram) {
            console.log('No active program to stop.');
            DisplayController.setActiveProgram();
            return "No active program to stop.";
        }

        const program = systemStatus.activeProgram;

        // Iterate through the zones of the active program and turn them off
        for (const zone of program.zones) {
            ZoneController.stopZone(zone.zoneId);
        }

        // Clear the active program and zone in the system status
        await systemStatusRepo.update(0, { activeProgram: null, activeZone: null });

        LogController.writeLog(`Program ${program.name} stopped and all zones turned off.`);
        console.log('Active program stopped and all zones turned off.');
        return "Active program stopped successfully.";
    }

}
