import React, { useEffect } from 'react';
import { Clock, Save, Undo, Edit2, Trash2, Plus, Waves, ArrowBigLeft } from 'lucide-react';
import { remult } from 'remult';
import {
  ConditionOperator,
  ConditionType,
  Program,
  ProgramRecurrenceType,
  ProgramSchedule,
} from '../shared/programs';
import { Zone } from '../shared/zones';
import { useStatusContext } from '../hooks/StatusContext';
import { useSettingsContext } from '../hooks/SettingsContext';
import { DateTimeUtils } from '../server/utilities/DateTimeUtils';
import { DateTime } from 'luxon';
import { ProgramController } from '../server/controllers/ProgramController';
import { programRepository } from '../server/data/repositories';

interface ProgramManagerProps {
}
interface DayOfWeek {
  num: number;
  name: string;
}

function formatProgramTime(value: string) {
  if (!value) {
    return '';
  }

  const isoTime = DateTime.fromISO(value);
  if (isoTime.isValid) {
    return isoTime.toFormat('hh:mm a');
  }

  const clockTime = DateTime.fromFormat(value, 'HH:mm');
  if (clockTime.isValid) {
    return clockTime.toFormat('hh:mm a');
  }

  return value;
}

function getProgramSchedules(program: Program): ProgramSchedule[] {
  if (program.schedules?.length) {
    return program.schedules;
  }

  return [{
    id: `${program.id}-legacy-schedule`,
    startTime: program.startTime || '',
    isEnabled: true,
    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
    daysOfWeek: program.daysOfWeek || [],
    intervalDays: null,
    lastScheduledRunTime: null,
    nextScheduledRunTime: program.nextScheduledRunTime,
  }];
}

export function ProgramManager({ }: ProgramManagerProps) {
  const [editingProgram, setEditingProgram] = React.useState<string>("");
  const [programDraft, setProgramDraft] = React.useState<Program | null>(null);
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [allZones, setAllZones] = React.useState<Zone[]>([]);
  const [zoneDurationDrafts, setZoneDurationDrafts] = React.useState<Record<string, string>>({});
  const [zoneDurationUnits, setZoneDurationUnits] = React.useState<Record<string, 'seconds' | 'minutes'>>({});
  const [programValidationError, setProgramValidationError] = React.useState<string | null>(null);
  const programRepo = programRepository;
  const systemStatus = useStatusContext();
  const systemSettings = useSettingsContext();

  useEffect(() => {
    remult.repo(Zone).find().then(setAllZones);
    return programRepo.liveQuery().subscribe((info) => setPrograms(info.applyChanges));
  }, []);

  const daysOfWeek: DayOfWeek[] = [
    { num: 0, name: 'Sun' }, { num: 1, name: 'Mon' }, { num: 2, name: 'Tue' },
    { num: 3, name: 'Wed' }, { num: 4, name: 'Thu' }, { num: 5, name: 'Fri' }, { num: 6, name: 'Sat' }
  ];

  const initializeZoneEditingState = (program: Program) => {
    setZoneDurationDrafts(
      Object.fromEntries(program.zones.map((zone) => [zone.zoneId, String(zone.duration)]))
    );
    setZoneDurationUnits(
      Object.fromEntries(program.zones.map((zone) => [zone.zoneId, 'seconds']))
    );
  };

  const handleSaveProgram = async () => {
    if (!programDraft) return;
    try {
      setProgramValidationError(null);
      const normalizedZones = programDraft.zones.map((zone) => {
        const rawDuration = zoneDurationDrafts[zone.zoneId] ?? String(zone.duration);
        const parsedDuration = rawDuration.trim() === '' ? 0 : Number(rawDuration);
        const unit = zoneDurationUnits[zone.zoneId] ?? 'seconds';

        return {
          ...zone,
          duration: Number.isFinite(parsedDuration)
            ? Math.round(parsedDuration * (unit === 'minutes' ? 60 : 1))
            : 0,
        };
      });

      if (
        programDraft.isEnabled &&
        getProgramSchedules(programDraft).some(
          (schedule) =>
            schedule.isEnabled &&
            schedule.recurrenceType === ProgramRecurrenceType.DAYS_OF_WEEK &&
            schedule.daysOfWeek.length === 0
        )
      ) {
        setProgramValidationError('Select at least one day for each enabled weekly schedule.');
        return;
      }

      if (
        programDraft.isEnabled &&
        getProgramSchedules(programDraft).some(
          (schedule) =>
            schedule.isEnabled &&
            schedule.recurrenceType === ProgramRecurrenceType.EVERY_N_DAYS &&
            (schedule.intervalDays ?? 0) <= 1
        )
      ) {
        setProgramValidationError('Repeat every N days must be greater than 1 for enabled schedules.');
        return;
      }

      const validZones = normalizedZones.filter((z) => allZones.some((zone) => zone.id === z.zoneId));
      if (programDraft.isEnabled && !validZones.some((zone) => zone.duration > 0)) {
        setProgramValidationError('Enter a duration greater than 0 for at least one selected zone.');
        return;
      }
      console.log('Valid Zones:', validZones);
      const nextRunDate = await ProgramController.calculateNextScheuleDate(programDraft);
      const updatedProgramDraft: Program = { ...programDraft, zones: validZones, nextScheduledRunTime: nextRunDate };
      console.log('Updated Program Draft:', updatedProgramDraft);
      await programRepo.update(updatedProgramDraft.id, updatedProgramDraft);
      setPrograms((prevPrograms) =>
        prevPrograms.map((p) => (p.id === updatedProgramDraft.id ? updatedProgramDraft : p))
      );
      setEditingProgram('');
      setProgramDraft(null);
      setProgramValidationError(null);
      setZoneDurationDrafts({});
      setZoneDurationUnits({});
    } catch (e) {
      console.error(e);
    }
  };

  const handleSkipNextRun = async (programId: string) => {
    console.log('Skipping next run for program:', programId);
    const program = programs.find((p) => p.id === programId);
    if (program) {

      const updatedProgram = { ...program, skipUntil: program.nextScheduledRunTime };
      updatedProgram.nextScheduledRunTime = await ProgramController.calculateNextScheuleDate(updatedProgram);
      await programRepo.update(programId, updatedProgram);
      setPrograms((prevPrograms) =>
        prevPrograms.map((p) => (p.id === updatedProgram.id ? updatedProgram : p))
      );
      console.log('Program skipped until next run:', updatedProgram);
    }
    else {
      console.error('Program not found');
    }
  }

  const handleCancelSkipNextRun = async (programId: string) => {
    const program = programs.find((p) => p.id === programId);
    if (program) {
      const updatedProgram = { ...program, skipUntil: null };
      updatedProgram.nextScheduledRunTime = await ProgramController.calculateNextScheuleDate(updatedProgram);
      await programRepo.update(programId, updatedProgram);
      setPrograms((prevPrograms) =>
        prevPrograms.map((p) => (p.id === updatedProgram.id ? updatedProgram : p))
      );
    }
  }

  const handleCancelEdit = () => {
    const originalProgram = programs.find((p) => p.id === editingProgram);
    if (originalProgram) setProgramDraft({ ...originalProgram });
    setEditingProgram('');
    setProgramValidationError(null);
    setZoneDurationDrafts({});
    setZoneDurationUnits({});
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      await programRepo.delete(programId);
      setPrograms((programs) => programs.filter(p => p.id !== programId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunProgram = async (programId: string) => {
    try {
      await ProgramController.runProgram(programId, true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopActiveProgram = async () => {
    try {
      await ProgramController.stopActiveProgram();
    } catch (e) {
      console.error(e);
    }
  };

  const onAddProgram = async () => {
    await programRepo.insert({
      name: 'New Program',
      isEnabled: true,
      startTime: '12:00 pm',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      zones: []
    });
  };

  const renderProgramZones = (program: Program) => (
    <div>
      <h4 className="font-medium text-gray-700">Zones</h4>
      {editingProgram === program.id ? (
        <div className="mt-1 space-y-2">
          {allZones.map((zone) => (
            <div key={zone.id} className="flex items-center space-x-4">
              <input
                type="checkbox"
                checked={programDraft?.zones.some((z) => z.zoneId === zone.id) || false}
                onChange={(e) => {
                  const updatedZones = e.target.checked
                    ? [...(programDraft?.zones || []), { zoneId: zone.id, duration: 10 }]
                    : programDraft?.zones.filter((z) => z.zoneId !== zone.id) || [];
                  setProgramDraft({ ...programDraft!, zones: updatedZones });
                  setZoneDurationDrafts((current) => {
                    if (e.target.checked) {
                      return { ...current, [zone.id]: current[zone.id] ?? '10' };
                    }

                    const nextDrafts = { ...current };
                    delete nextDrafts[zone.id];
                    return nextDrafts;
                  });
                  setZoneDurationUnits((current) => {
                    if (e.target.checked) {
                      return { ...current, [zone.id]: current[zone.id] ?? 'seconds' };
                    }

                    const nextUnits = { ...current };
                    delete nextUnits[zone.id];
                    return nextUnits;
                  });
                }}
              />
              <span className={`text-sm ${!zone.enabled ? 'text-red-600' : 'text-gray-900'}`}>
                {zone.name}
                {!zone.enabled && <span className="ml-2 text-xs text-red-500">(Disabled)</span>}
              </span>
              {programDraft?.zones.some((z) => z.zoneId === zone.id) && (
                <>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Duration for ${zone.name}`}
                    value={zoneDurationDrafts[zone.id] ?? String(programDraft?.zones.find((z) => z.zoneId === zone.id)?.duration ?? '')}
                    onChange={(e) => {
                      setZoneDurationDrafts((current) => ({
                        ...current,
                        [zone.id]: e.target.value,
                      }));
                    }}
                    className="w-16 border rounded px-2 py-1 text-sm"
                  />
                  <select
                    aria-label={`Duration unit for ${zone.name}`}
                    value={zoneDurationUnits[zone.id] ?? 'seconds'}
                    onChange={(e) => {
                      setZoneDurationUnits((current) => ({
                        ...current,
                        [zone.id]: e.target.value as 'seconds' | 'minutes',
                      }));
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                  </select>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {allZones.map((zone) => {
            const programZone = program.zones.find((z) => z.zoneId === zone.id);
            if (!programZone) return null;
            return (
              <li key={zone.id} className="flex items-center space-x-4">
                <span className={`text-sm ${zone.enabled ? 'text-gray-900' : 'text-red-600'}`}>
                  {zone.name || 'Unknown Zone'}
                  {!zone.enabled && <span className="ml-2 text-xs text-red-500">(Disabled)</span>}
                </span>
                <span className="text-sm text-gray-500">{programZone.duration} sec</span>
                {systemStatus?.activeZone?.id === zone.id && (
                  <ArrowBigLeft className="ml-2 text-xs text-blue-600" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const renderProgramSchedule = (program: Program) => (
    <div>
      <h4 className="font-medium text-gray-700">
        {program.schedules?.length ? 'Schedules' : 'Schedule'}
      </h4>
      {editingProgram === program.id ? (
        <div className="flex-1 space-y-3">
          {getProgramSchedules(programDraft || program).map((schedule) => (
            <div key={schedule.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={schedule.isEnabled}
                    onChange={(e) => {
                      const schedules = getProgramSchedules(programDraft || program).map((currentSchedule) =>
                        currentSchedule.id === schedule.id
                          ? { ...currentSchedule, isEnabled: e.target.checked }
                          : currentSchedule
                      );
                      setProgramDraft({ ...(programDraft || program), schedules });
                    }}
                  />
                  Enabled
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Schedule time</label>
                <input
                  type="time"
                  aria-label="Schedule time"
                  value={schedule.startTime}
                  onChange={(e) => {
                    const schedules = getProgramSchedules(programDraft || program).map((currentSchedule) =>
                      currentSchedule.id === schedule.id
                        ? { ...currentSchedule, startTime: e.target.value }
                        : currentSchedule
                    );
                    setProgramDraft({ ...(programDraft || program), schedules });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Recurrence type</label>
                <select
                  aria-label="Recurrence type"
                  value={schedule.recurrenceType}
                  onChange={(e) => {
                    const recurrenceType = e.target.value as ProgramSchedule['recurrenceType'];
                    const schedules = getProgramSchedules(programDraft || program).map((currentSchedule) => {
                      if (currentSchedule.id !== schedule.id) {
                        return currentSchedule;
                      }

                      return {
                        ...currentSchedule,
                        recurrenceType,
                        daysOfWeek: recurrenceType === ProgramRecurrenceType.DAYS_OF_WEEK
                          ? currentSchedule.daysOfWeek
                          : [],
                        intervalDays: recurrenceType === ProgramRecurrenceType.EVERY_N_DAYS
                          ? currentSchedule.intervalDays ?? 2
                          : null,
                      };
                    });
                    setProgramDraft({ ...(programDraft || program), schedules });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value={ProgramRecurrenceType.DAYS_OF_WEEK}>Days of week</option>
                  <option value={ProgramRecurrenceType.EVERY_N_DAYS}>Every N days</option>
                </select>
              </div>
              <div>
                {schedule.recurrenceType === ProgramRecurrenceType.EVERY_N_DAYS ? (
                  <>
                    <label className="block text-sm text-gray-600">Repeat every N days</label>
                    <input
                      type="number"
                      min={2}
                      aria-label="Repeat every N days"
                      value={schedule.intervalDays ?? 2}
                      onChange={(e) => {
                        const schedules = getProgramSchedules(programDraft || program).map((currentSchedule) =>
                          currentSchedule.id === schedule.id
                            ? {
                                ...currentSchedule,
                                intervalDays: Number(e.target.value) || 2,
                              }
                            : currentSchedule
                        );
                        setProgramDraft({ ...(programDraft || program), schedules });
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </>
                ) : (
                  <>
                <label className="block text-sm text-gray-600">Days</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day.num}
                      type="button"
                      onClick={() => {
                        const schedules = getProgramSchedules(programDraft || program).map((currentSchedule) => {
                          if (currentSchedule.id !== schedule.id) {
                            return currentSchedule;
                          }

                          const scheduleDays = currentSchedule.daysOfWeek.includes(day.num)
                            ? currentSchedule.daysOfWeek.filter((d) => d !== day.num)
                            : [...currentSchedule.daysOfWeek, day.num];

                          return { ...currentSchedule, daysOfWeek: scheduleDays };
                        });
                        setProgramDraft({ ...(programDraft || program), schedules });
                      }}
                      className={`px-2 py-1 text-sm rounded-md ${
                        schedule.daysOfWeek.includes(day.num)
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {day.name}
                    </button>
                  ))}
                </div>
                  </>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            aria-label="Add schedule"
            onClick={() => {
              const schedules = [
                ...getProgramSchedules(programDraft || program),
                {
                  id: `schedule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                  startTime: '06:00',
                  isEnabled: true,
                  recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                  daysOfWeek: [],
                  intervalDays: null,
                  lastScheduledRunTime: null,
                  nextScheduledRunTime: null,
                },
              ];
              setProgramDraft({ ...(programDraft || program), schedules });
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add schedule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {getProgramSchedules(program).map((schedule) => (
            <div key={schedule.id} className="flex items-start space-x-4">
              <Clock className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {formatProgramTime(schedule.startTime)}
                </p>
                <p className="text-sm text-gray-500">
                  {schedule.intervalDays
                    ? `Every ${schedule.intervalDays} days`
                    : (schedule.daysOfWeek || [])
                        .sort((a, b) => a - b)
                        .map((day) => daysOfWeek.find((d) => d.num === day)?.name)
                        .join(', ')}
                  {schedule.isEnabled === false && <span className="ml-2 text-xs text-red-500">(Disabled)</span>}
                </p>
              </div>
            </div>
          ))}
          {program.skipUntil && (
            <>
              <p className="text-xs text-orange-600 mt-1">
                Skipped until {DateTime.fromISO(program.skipUntil).toLocaleString(DateTime.DATE_MED)}
              </p>
              <button
                type="button"
                className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                onClick={async () => {
                  setProgramDraft({ ...programDraft!, skipUntil: null });
                }}
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderProgramConditions = (program: Program) => (
    <div>
    <h4 className="font-medium text-gray-700">Conditions</h4>
    {editingProgram === program.id ? (
      <div className="space-y-4">
        {programDraft?.conditions?.map((condition, index) => (
          <div key={index} className="flex items-center space-x-4">
            <select
              value={condition.type}
              onChange={(e) => {
                const updatedConditions = [...programDraft.conditions];
                updatedConditions[index].type = e.target.value as ConditionType;
                setProgramDraft({ ...programDraft, conditions: updatedConditions });
              }}
              className="border rounded px-2 py-1"
            >
              <option value="temperature">Temperature</option>
              <option value="moisture">Moisture</option>
            </select>
            <select
              value={condition.operator}
              onChange={(e) => {
                const updatedConditions = [...programDraft.conditions];
                updatedConditions[index].operator = e.target.value as ConditionOperator;
                setProgramDraft({ ...programDraft, conditions: updatedConditions });
              }}
              className="border rounded px-2 py-1"
            >
              {['=', '!=', '<', '>', '<=', ">="].map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={condition.value}
              onChange={(e) => {
                const updatedConditions = [...programDraft.conditions];
                updatedConditions[index].value = parseFloat(e.target.value) || 0;
                setProgramDraft({ ...programDraft, conditions: updatedConditions });
              }}
              className="border rounded px-2 py-1"
            />
            <button
              onClick={() => {
                const updatedConditions = programDraft.conditions.filter((_, i) => i !== index);
                setProgramDraft({ ...programDraft, conditions: updatedConditions });
              }}
              className="text-red-400 hover:text-red-600"
              disabled={programDraft.conditions.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const newCondition = { type: ConditionType.TEMPERATURE, operator: '==' as ConditionOperator, value: 0 };
            setProgramDraft({ ...programDraft!, conditions: [...(programDraft?.conditions || []), newCondition] });
          }}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Condition
        </button>
      </div>
    ) : (
      <ul className="mt-2 space-y-2">
        {program.conditions?.map((condition, index) => (
          <li key={index} className="text-sm text-gray-700">
            {condition.type} {condition.operator} {condition.value}
          </li>
        ))}
      </ul>
    )}
  </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Irrigation Programs</h2>
        <button
          onClick={onAddProgram}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Program
        </button>
      </div>

      <div className="grid gap-6">
        {programs.map((program: Program) => (
          <div key={program.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {editingProgram === program.id ? (
                <input
                  type="text"
                  value={programDraft?.name || ''}
                  onChange={(e) => setProgramDraft({ ...programDraft!, name: e.target.value })}
                  className="border rounded px-2 py-1"
                />
              ) : (
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  {program.name}
                  {!program.isEnabled && (
                  <span className="text-sm font-medium text-red-600 ml-2">Disabled</span>
                  )}
                  {systemStatus?.activeProgram?.id === program.id && (
                  <Waves className="h-5 w-5 text-blue-600 ml-2" />
                  )}
                </h3>
              )}
              <div className="text-sm text-gray-500">
                Next Run:{' '}
                {program.nextScheduledRunTime
                  ? DateTimeUtils.isoToDateTimeShortStr(program.nextScheduledRunTime, systemSettings.timezone)
                  : 'Not Scheduled'}
                {program.skipUntil && (
                  <span className="ml-2 text-xs text-orange-600">
                    (Skip until {DateTimeUtils.isoToDateTimeShortStr(program.skipUntil, systemSettings.timezone)})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-xs ${
                  !program?.nextScheduledRunTime
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  onClick={() => handleSkipNextRun(program.id)}
                  disabled={!program?.nextScheduledRunTime}
                  title="Set to next scheduled run"
                >
                  Skip Next
                </button>
                {program.skipUntil && (
                  <button
                    type="button"
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                    onClick={() => handleCancelSkipNextRun(program.id)}
                  >
                    Cancel Skip
                  </button>
                )}
                {systemStatus?.activeProgram?.id === program.id ? (
                  <button
                    onClick={handleStopActiveProgram}
                    className="px-2 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Stop
                  </button>
                ) : (
                    <button
                    onClick={() => handleRunProgram(program.id)}
                    className={`px-2 py-1 text-sm rounded-md ${
                      editingProgram === program.id || !program.isEnabled
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                    disabled={editingProgram === program.id || !program.isEnabled}
                    aria-label={`Run program ${program.name}`}
                    >
                    Run
                    </button>
                )}
                {editingProgram === program.id ? (
                  <>
                    <button
                      onClick={() => {
                        if (programDraft) {
                          setProgramDraft({ ...programDraft, isEnabled: !programDraft.isEnabled });
                        }
                      }}
                     aria-label={`Toggle program ${program.name}`}
                     className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors ${
                       programDraft?.isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                     }`}
                    >
                     <span
                       className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ${
                         programDraft?.isEnabled ? 'translate-x-5' : 'translate-x-0'
                       }`}
                     />
                    </button>
                    <button aria-label={`Cancel editing ${program.name}`} onClick={handleCancelEdit} className="p-1 text-gray-400 hover:text-gray-600">
                      <Undo className="h-4 w-4" />
                    </button>
                    <button aria-label={`Save program ${program.name}`} onClick={handleSaveProgram} className="p-1 text-blue-400 hover:text-blue-600">
                      <Save className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingProgram(program.id);
                        setProgramDraft({ ...program, schedules: getProgramSchedules(program) });
                        setProgramValidationError(null);
                        initializeZoneEditingState(program);
                      }}
                      aria-label={`Edit program ${program.name}`}
                      className="p-1 text-green-400 hover:text-green-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                 aria-label={`Delete program ${program.name}`}
                  onClick={() => {
                  if (window.confirm('Are you sure you want to delete this program?')) {
                    handleDeleteProgram(program.id);
                  }
                  }}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {renderProgramZones(program)}
              {renderProgramSchedule(program)}
              {renderProgramConditions(program)}
            </div>
            {editingProgram === program.id && programValidationError && (
              <p className="mt-4 text-sm text-red-600">{programValidationError}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
