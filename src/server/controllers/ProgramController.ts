import { BackendMethod } from 'remult';
import { ConditionOperator, ConditionType, Program } from '../../shared/programs';
import { DateTimeUtils } from '../utilities/DateTimeUtils';
import { ZoneController } from './ZoneController';
import { LogController } from './LogController';
import { DisplayController } from './DisplayController';
import { programRepository, settingsRepository, systemStatusRepository } from '../data/repositories';
import { calculateProgramSchedules } from './programScheduleUtils';

export class ProgramController {

    @BackendMethod({ allowed: true, apiPrefix: 'programs' })
    static async calculateNextScheuleDate(program: Program, skipToday?: boolean): Promise<string | null> {
        console.log(`Calculating next schedule date for program ${program.name}`);
        if (!program.zones || program.zones.length === 0) {
            console.log(`Program ${program.name} has no zones. Cannot calculate schedule.`);
            return null;
        }

        const settings = await settingsRepository.findFirst();
        const timezone = settings?.timezone || 'UTC';
        console.log(`Calculating schedule for program ${program.name} in timezone ${timezone}`);
        const scheduledProgram = calculateProgramSchedules(program, timezone, skipToday);
        console.log(`Next run date for program ${program.name} is ${scheduledProgram.nextScheduledRunTime}`);
        return scheduledProgram.nextScheduledRunTime;
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
        
        const settings = await settingsRepository.findFirst();
        const timezone = settings?.timezone || 'UTC';
        const scheduledProgram = calculateProgramSchedules(program, timezone, skipToday);

        await programRepo.update(program.id, {
            schedules: scheduledProgram.schedules,
            nextScheduledRunTime: scheduledProgram.nextScheduledRunTime,
        });
       
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

            LogController.writeEvent(
                `Running program ${program.name}`,
                'INFO',
                'program',
                'program-start',
                {
                    programId: program.id,
                    programName: program.name,
                    isManual: false,
                    zoneCount: program.zones.length,
                }
            );
        } else {
            LogController.writeEvent(
                `Manual - Running program ${program.name}`,
                "INFO",
                'program',
                'program-start',
                {
                    programId: program.id,
                    programName: program.name,
                    isManual: true,
                    zoneCount: program.zones.length,
                },
                true
            );
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
                LogController.writeEvent(
                    `Program ${program.name} has been manually stopped`,
                    "WARNING",
                    'program',
                    'program-stopped',
                    {
                        programId: program.id,
                        programName: program.name,
                        replacementProgramId: currentSystemStatus?.activeProgram?.id ?? null,
                        replacementProgramName: currentSystemStatus?.activeProgram?.name ?? null,
                    }
                );
                break;
            }
            await ZoneController.runZoneBlocking(zone.zoneId, zone.duration);
        }

        LogController.writeEvent(
            `Program ${program.name} completed`,
            'INFO',
            'program',
            'program-completed',
            {
                programId: program.id,
                programName: program.name,
                zoneCount: program.zones.length,
            }
        );
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
        await LogController.writeEvent(
            `Program ${program.name} stop requested`,
            'INFO',
            'program',
            'program-stop-requested',
            {
                programId: program.id,
                programName: program.name,
                zoneCount: program.zones.length,
            }
        );

        // Iterate through the zones of the active program and turn them off
        for (const zone of program.zones) {
            await ZoneController.stopZone(zone.zoneId, 'program-stop');
        }

        // Clear the active program and zone in the system status
        await systemStatusRepository.update(0, { activeProgram: null, activeZone: null });

        LogController.writeEvent(
            `Program ${program.name} stopped and all zones turned off.`,
            'INFO',
            'program',
            'program-stopped',
            {
                programId: program.id,
                programName: program.name,
                zoneCount: program.zones.length,
            }
        );
        console.log('Active program stopped and all zones turned off.');
        DisplayController.setActiveProgram();
        return "Active program stopped successfully.";
    }

}
