import React from "react";
import { remult } from "remult";
import { DateTimeUtils } from "../server/utilities/DateTimeUtils";
import { Program } from "../shared/programs";
import { Clock, Waves } from "lucide-react";
import { useSettingsContext } from "../hooks/SettingsContext";
import { useStatusContext } from "../hooks/StatusContext";


export const ScheduleCard: React.FC = () => {
    const systemSettings = useSettingsContext();
    const systemStatus = useStatusContext();
    if (!systemStatus || !systemSettings) {
        return "Loading...";
    }

    const programRepo = remult.repo(Program);
    const [scheduledPrograms, setScheduledPrograms] = React.useState<
        { program: Program; nextScheduledRunTime: Date | null; isRunning: boolean }[]
    >([]);

    const fetchScheduledPrograms = React.useCallback(async () => {
        const programs = await programRepo.find({
            where: { isEnabled: true },
        });
        const validPrograms = programs
            .map(program => ({
                program,
                nextScheduledRunTime: DateTimeUtils.fromISODateTime(
                    program.nextScheduledRunTime,
                    systemSettings.timezone
                ),
                isRunning: systemStatus?.activeProgram?.id === program.id,
            }))
            .filter(
                ({ nextScheduledRunTime, isRunning }) =>
                    nextScheduledRunTime !== null || isRunning
            )
            .sort((a, b) => {
                if (a.isRunning && !b.isRunning) return -1;
                if (!a.isRunning && b.isRunning) return 1;
                return (
                    (a.nextScheduledRunTime?.getTime() ?? 0) -
                    (b.nextScheduledRunTime?.getTime() ?? 0)
                );
            });
        setScheduledPrograms(validPrograms);
    }, [programRepo, systemSettings.timezone, systemStatus]);

    React.useEffect(() => {
        fetchScheduledPrograms();
        const interval = setInterval(
            fetchScheduledPrograms,
            3000
        );
        return () => clearInterval(interval);
    }, [fetchScheduledPrograms]);

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
                Scheduled Watering Programs
            </h2>
            {scheduledPrograms.length > 0 ? (
                <div className="space-y-4">
                    {scheduledPrograms.map(({ program, isRunning }) => (
                        <div
                            key={program.id}
                            className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                        >
                            <div className="flex items-center space-x-3">
                                {isRunning ? (
                                    <Waves className="h-6 w-6 text-blue-600" />
                                ) : (
                                    <Clock className="h-6 w-6 text-blue-600" />
                                )}
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {program.name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {isRunning
                                            ? "Running..."
                                            : `Starts at ${DateTimeUtils.isoToDateTimeShortStr(
                                                  program.nextScheduledRunTime,
                                                  systemSettings.timezone
                                              )}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 text-left py-4">
                    No programs scheduled
                </p>
            )}
        </div>
    );
}; 