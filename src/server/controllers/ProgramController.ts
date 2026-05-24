import { DateTime } from 'luxon';
import { BackendMethod } from 'remult';
import { ConditionOperator, ConditionType, Program } from '../../shared/programs';
import { DateTimeUtils } from '../utilities/DateTimeUtils';
import { ZoneController } from './ZoneController';
import { LogController } from './LogController';
import { DisplayController } from './DisplayController';
import { programRepository, settingsRepository, systemStatusRepository } from '../data/repositories';

export class ProgramController {

    @BackendMethod({ allowed: true, apiPrefix: 'programs' })
    static async calculateNextScheuleDate(program: Program, skipToday?: boolean): Promise<string | null> {
console.log(`Calculating next schedule date for program ${program.name}`);
        if (!program.zones || program.zones.length === 0) {
            console.log(`Program ${program.name} has no zones. Cannot calculate schedule.`);
            return null;
        }

        if (!program.daysOfWeek || program.daysOfWeek.length === 0) {
            console.log(`Program ${program.name} has no days of the week specified. Cannot calculate schedule.`);
            return null;
        }

        if (!program.startTime) {
            console.log(`Program ${program.name} has no start time specified. Cannot calculate schedule.`);
            return null;
        }

        const settings = await settingsRepository.findFirst();
        const timezone = settings?.timezone || 'UTC';
        console.log(`Calculating schedule for program ${program.name} in timezone ${timezone}`);

        const getNextRunDate = (
            daysOfWeek: number[],
            startTime: string,
            lastRunDate: Date | null,
            afterDate?: Date
        ): string | null => {
            if (!daysOfWeek || daysOfWeek.length === 0) {
                console.log('No days of the week provided');
                return null;
            }
            const [hours, minutes] = startTime.split(':').map(Number);
            const now = DateTime.now().setZone(timezone);
            const todayDayOfWeek = now.weekday % 7; // Convert Luxon's weekday (1-7) to JS's (0-6)
            const sortedDaysOfWeek = [...daysOfWeek].sort((a, b) => a - b);

            let nextRunDate: Date | null = null;

            // Try up to two weeks ahead to find a valid date after afterDate
            let candidateDate = now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
            for (let i = 0; i < (7*52); i++) { // Check up to 52 weeks ahead
                const currentDayOfWeek = candidateDate.weekday % 7; // 0 (Sunday) - 6 (Saturday)
                if (
                    sortedDaysOfWeek.includes(currentDayOfWeek) &&
                    (!skipToday || i > 0)
                ) {
                    const candidateJSDate = candidateDate.toJSDate();
                    if (
                        candidateDate >= now &&
                        (!lastRunDate || candidateJSDate > lastRunDate) &&
                        (!afterDate || candidateJSDate > afterDate)
                    ) {
                        nextRunDate = candidateJSDate;
                        break;
                    }
                }
                candidateDate = candidateDate.plus({ days: 1 });
            }

            if (!nextRunDate) {
                // Fallback: next week, first day
                const firstDayOfWeek = sortedDaysOfWeek[0];
                const candidateDate = now
                    .plus({ days: 7 - todayDayOfWeek + firstDayOfWeek })
                    .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
                const candidateJSDate = candidateDate.toJSDate();
                if (
                    (!lastRunDate || candidateJSDate > lastRunDate) &&
                    (!afterDate || candidateJSDate > afterDate)
                ) {
                    nextRunDate = candidateJSDate;
                }
            }
            console.log(`Next run date for program ${program.name} is ${nextRunDate}`);
            return DateTimeUtils.toISODateTime(nextRunDate, timezone);
        };

        const { lastRunTime, daysOfWeek, startTime } = program;
        const lastRunDate = lastRunTime ? DateTimeUtils.fromISODateTime(lastRunTime, timezone) : null;
        let afterDate: Date | undefined = undefined;
        if (program.skipUntil) {
            const parsedDate = DateTimeUtils.fromISODateTime(program.skipUntil, timezone);
            if (parsedDate) {
                afterDate = parsedDate;
            }
        }

        let nextRun = getNextRunDate(daysOfWeek, startTime, lastRunDate, afterDate);

        // If scheduleAfter is provided and nextRun is before or equal to scheduleAfter, find the next one after scheduleAfter
        if (program.skipUntil && nextRun) {
            const nextRunDateObj = DateTimeUtils.fromISODateTime(nextRun, timezone);
            if (nextRunDateObj && afterDate && nextRunDateObj <= afterDate) {
                // Try again, but now afterDate is scheduleAfter
                nextRun = getNextRunDate(daysOfWeek, startTime, lastRunDate, afterDate);
            }
        }

        return nextRun;
    }

    /**
     * Calculates the next scheduled run date for each program.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'programs' })
    static async updateProgramSchedule(programId: string, skipToday?: boolean) {

        const programRepo = programRepository;

        const program = await programRepo.findId(programId);

        if (!program) {
            console.error(`Program with ID ${programId} not found`);
            LogController.writeLog(`Program with ID ${programId} not found in Schedule Calculation`, "ERROR");
            return "Program not found.";
        }
        
        const nextRunDate = await ProgramController.calculateNextScheuleDate(program, skipToday);

        await programRepo.update(program.id, { nextScheduledRunTime: nextRunDate });
       
        return "Next scheduled run dates calculated successfully";
    }

    @BackendMethod({ allowed: true, apiPrefix: 'programs' })
    static async recalculateAllSchedules() {
        const programRepo = programRepository;
        const programs = await programRepo.find();

        for (const program of programs) {
            this.updateProgramSchedule(program.id);
        }
    }

    /**
    * Runs a program by iterating through its zones and activating relays.
    * @param programId - The ID of the program to run.
    */
    @BackendMethod({ allowed: true, apiPrefix: 'programs' })
    static async runProgram(programId: string, isManual?: boolean) {
        const programRepo = programRepository;
        const systemStatus = await systemStatusRepository.findFirst();
        const settings = await settingsRepository.findFirst();
        const timezone = settings?.timezone || 'UTC';

        const program = await programRepo.findId(programId);
        if (!program) {
            console.error(`Program with ID ${programId} not found`);
            LogController.writeLog(`Program with ID ${programId} not found`, "ERROR");
            return;
        }

        // Calculate the next scheduled run date for the program
        if (!isManual) {
            ProgramController.updateProgramSchedule(programId, true);

            if (program.conditions && program.conditions.length > 0) {
                for (const condition of program.conditions) {
                    const { type, operator, value } = condition;
                    let isConditionMet = false;

                    switch (type) {
                        case ConditionType.TEMPERATURE: {
                            const currentTemperature = systemStatus?.weatherData?.current?.temperature || 0;
                            isConditionMet = evaluateCondition(operator, currentTemperature, value);

                            console.log("Condition evaluation result:", isConditionMet, type, operator, value, currentTemperature);
                            break;
                        }

                        case ConditionType.MOISTURE:
                            isConditionMet = true; // Placeholder for moisture condition
                            break;
                            
                        default:
                            console.log(`Unknown condition type: ${type}`);
                            break;
                    }
                    if (!isConditionMet) {
                        console.log(`Condition ${type} ${operator} ${value} not met, skipping ${program.name}`);
                        LogController.writeLog(`Condition ${type} ${operator} ${value} not met, skipping ${program.name}`, "WARNING");
                        return;
                    }
                }
            }

            LogController.writeLog(`Running program ${program.name}`);
        } else {
            LogController.writeLog(`Manual - Running program ${program.name}`, "INFO", true);
        }
        
        DisplayController.setActiveProgram(program.name);
        console.log(`Running program ${program.name}`);

        // Set the active program in the system status
        if (systemStatus) {
            await systemStatusRepository.update(systemStatus.id, { activeProgram: program });
        }

        // Update program's lastRunTime
        await programRepo.update(program.id, {
            lastRunTime: DateTimeUtils.toISODateTime(new Date(), timezone)
        });

        for (const zone of program.zones) {
            // Check if the program is still the active program
            const currentSystemStatus = await systemStatusRepository.findFirst();

            if (!currentSystemStatus || currentSystemStatus.activeProgram?.id !== program.id) {
                console.log(`Program ${program.name} has been manually stopped or replaced. Aborting.`);
                LogController.writeLog(`Program ${program.name} has been manually stopped`, "WARNING");
                break;
            }
            await ZoneController.runZoneBlocking(zone.zoneId, zone.duration);
        }

        LogController.writeLog(`Program ${program.name} completed`);
        // Clear the active program in the system status
        if (systemStatus) {
            await systemStatusRepository.update(systemStatus.id, { activeProgram: null });
        }

        function evaluateCondition(operator: ConditionOperator, referenceValue: number, thresholdValue: number) {
            switch (operator) {
                case "=":
                    return referenceValue === thresholdValue;
                case ">":
                    return referenceValue > thresholdValue;
                case ">=":
                    return referenceValue >= thresholdValue;
                case "<":
                    return referenceValue < thresholdValue;
                case "<=":
                    return referenceValue <= thresholdValue;
                default:
                    return true;
            }
        }
    }

    /**
     * Checks for the next program to run and triggers it if necessary.
     */
    static async runNextScheduledProgram() {
        const programRepo = programRepository;
        const programs = await programRepo.find();
        const settings = await settingsRepository.findFirst();
        const timezone = settings?.timezone || 'UTC';
        const now = new Date();

        const systemStatus = await systemStatusRepository.findFirst();
        if (systemStatus?.activeProgram) {
            console.log('An active program is already running. Exiting function.');
            return;
        }

        const programToRun = programs.find((program) => {
            if (!program.isEnabled) {
                //console.log(`Skipping disabled program ${program.name}`);
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
            ProgramController.runProgram(programToRun.id, false);
        }
    }


    /**
     * Stops the currently active program by clearing the activeProgram in systemStatus
     * and turning off all zone relays one at a time.
     */
    @BackendMethod({ allowed: true, apiPrefix: 'programs' })
    static async stopActiveProgram() {
        const systemStatus = await systemStatusRepository.findFirst();
        if (!systemStatus || !systemStatus.activeProgram) {
            console.log('No active program to stop.');
            DisplayController.setActiveProgram();
            return "No active program to stop.";
        }

        const program = systemStatus.activeProgram;

        // Iterate through the zones of the active program and turn them off
        for (const zone of program.zones) {
            await ZoneController.stopZone(zone.zoneId);
        }

        // Clear the active program and zone in the system status
        await systemStatusRepository.update(0, { activeProgram: null, activeZone: null });

        LogController.writeLog(`Program ${program.name} stopped and all zones turned off.`);
        console.log('Active program stopped and all zones turned off.');
        DisplayController.setActiveProgram();
        return "Active program stopped successfully.";
    }

}
