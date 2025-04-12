import React, { useEffect } from 'react';
import { Clock, Save, Undo, Edit2, Trash2, Plus, Waves, ArrowBigLeft } from 'lucide-react';
import { remult } from 'remult';
import { Program } from '../shared/programs';
import { Zone } from '../shared/zones';
import { useStatusContext } from './StatusContext';
import { useSettingsContext } from './SettingsContext';
import { DateTimeUtils } from '../server/utilities/DateTimeUtils';
import { DateTime } from 'luxon';
import { ProgramController } from '../server/controllers/ProgramController';

interface ProgramManagerProps {
}
interface DayOfWeek {
  num: number;
  name: string;
}
export function ProgramManager({ }: ProgramManagerProps) {
  const [editingProgram, setEditingProgram] = React.useState<string>("");
  const [programDraft, setProgramDraft] = React.useState<Program | null>(null);
  const programRepo = remult.repo(Program);
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [zones, setZones] = React.useState<Zone[]>([]);
  const systemStatus = useStatusContext();
  const systemSettings = useSettingsContext();

  useEffect(() => {
    remult.repo(Zone).find().then(setZones);
    return programRepo.liveQuery().subscribe((info) => setPrograms(info.applyChanges));
  }, []);

  const daysOfWeek: DayOfWeek[] = [
    { num: 0, name: 'Sun' },
    { num: 1, name: 'Mon' },
    { num: 2, name: 'Tue' },
    { num: 3, name: 'Wed' },
    { num: 4, name: 'Thu' },
    { num: 5, name: 'Fri' },
    { num: 6, name: 'Sat' }
  ];

  const handleSaveProgram = async () => {
    if (!programDraft) return;

    try {
      await programRepo.update(programDraft.id, programDraft);
      setPrograms((programs) => programs.map((p) => (p.id === programDraft.id ? programDraft : p)));
      setEditingProgram('');
      setProgramDraft(null);
      ProgramController.calculateProgramSchedule(programDraft.id);
    } catch (e) {
      console.log(e);
    }
  };

  const handleCancelEdit = () => {
    if (editingProgram) {
      const originalProgram = programs.find((p) => p.id === editingProgram);
      if (originalProgram) {
        setProgramDraft({ ...originalProgram });
      }
      setEditingProgram('');
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return;

    try {
      await programRepo.delete(programId);
      setPrograms((programs) => programs.filter(p => p.id !== programId));
    } catch (e) {
      console.log(e);
    }
  };

  const onAddProgram = async (newProgram: Partial<Program>) => {
    await programRepo.insert(newProgram);
  };

  const handleStopActiveProgram = async () => {
    try {
      await ProgramController.stopActiveProgram();
    } catch (e) {
      console.log(e);
    }
  };

  const handleRunProgram = async (programId: string) => {
    try {
      await ProgramController.runProgram(programId);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Irrigation Programs</h2>
        <button
          onClick={() =>
            onAddProgram({
              name: 'New Program',
              isEnabled: true,
              startTime: '12:00 pm',
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              zones: []
            })
          }
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Program
        </button>
      </div>

      <div className="grid gap-6">
        {programs.map((program: Program) => (
          <div key={program.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              {editingProgram === program.id ? (
                <input
                  type="text"
                  value={programDraft?.name || ''}
                  onChange={(e) => setProgramDraft({ ...programDraft!, name: e.target.value })}
                  className="border rounded px-2 py-1"
                />
              ) : (
                <h3 className="text-lg font-medium text-gray-900">{program.name}</h3>
              )}
              <div className="text-sm text-gray-500">
                Next Run:{' '}
                {program.nextScheduledRunTime
                  ? DateTimeUtils.isoToDateTimeShortStr(program.nextScheduledRunTime, systemSettings.timezone)
                  : 'Not Scheduled'}
              </div>
              <div className="flex items-center space-x-4">
                {systemStatus?.activeProgram?.id === program.id && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Waves className="h-5 w-5" />
                    <span className="text-sm font-medium">Active</span>
                    <button
                      onClick={handleStopActiveProgram}
                      className="px-2 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Stop
                    </button>
                  </div>
                )}
                {systemStatus?.activeProgram?.id !== program.id && (
                  <button
                    onClick={() => handleRunProgram(program.id)}
                    className="px-2 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
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
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        programDraft?.isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          programDraft?.isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <button
                      onClick={handleCancelEdit}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Undo className='h-4 w-4' />
                    </button>
                    <button
                      onClick={handleSaveProgram}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                  <span className={`text-sm font-medium ${program.isEnabled ? 'text-green-600' : 'text-red-600'}`}>
                    {program.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => {
                        setEditingProgram(program.id);
                        setProgramDraft({ ...program });
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    {editingProgram === program.id ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  </button>
                  </>
                )}
                

                <button
                  onClick={() => handleDeleteProgram(program.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700">Zones</h4>
                {editingProgram === program.id ? (
                  <div className="mt-1 space-y-2">
                    {zones.map((zone) => (
                      <div key={zone.id} className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={programDraft?.zones.some((z) => z.zoneId === zone.id) || false}
                          onChange={(e) => {
                            const updatedZones = e.target.checked
                              ? [...(programDraft?.zones || []), { zoneId: zone.id, duration: 10 }]
                              : programDraft?.zones.filter((z) => z.zoneId !== zone.id) || [];
                            setProgramDraft({ ...programDraft!, zones: updatedZones });
                          }}
                        />
                        <span className={`text-sm ${!zone.enabled ? 'text-red-600' : 'text-gray-900'}`}>
                          {zone.name}
                          {!zone.enabled && <span className="ml-2 text-xs text-red-500">(Disabled)</span>}
                        </span>
                        {programDraft?.zones.some((z) => z.zoneId === zone.id) && (
                          <input
                            type="number"
                            value={programDraft?.zones.find((z) => z.zoneId === zone.id)?.duration || 0}
                            onChange={(e) => {
                              const updatedZones =
                                programDraft?.zones.map((z) =>
                                  z.zoneId === zone.id ? { ...z, duration: parseInt(e.target.value) || 0 } : z
                                ) || [];
                              setProgramDraft({ ...programDraft!, zones: updatedZones });
                            }}
                            className="w-16 border rounded px-2 py-1 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {program.zones.map((zone) => {
                      const zoneDetails = zones.find((z) => z.id === zone.zoneId);
                      return (
                        <li key={zone.zoneId} className="flex items-center space-x-4">
                          <span
                            className={`text-sm ${zoneDetails?.enabled ? 'text-gray-900' : 'text-red-600'}`}
                          >
                            {zoneDetails?.name || 'Unknown Zone'}
                            {!zoneDetails?.enabled && (
                              <span className="ml-2 text-xs text-red-500">(Disabled)</span>
                            )}
                          </span>
                          <span className="text-sm text-gray-500">{zone.duration} sec</span>
                          {systemStatus?.activeZone?.id === zone.zoneId && (
                            <ArrowBigLeft className="ml-2 text-xs text-blue-600" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="font-medium text-gray-700">Schedule</h4>
                {editingProgram === program.id ? (
                  <div className="flex-1 space-y-3">
                    <div className="flex space-x-4">
                      <div>
                        <label className="block text-sm text-gray-600">Start Time</label>
                        <input
                          type="time"
                          value={programDraft?.startTime || ''}
                          onChange={(e) => setProgramDraft({ ...programDraft!, startTime: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Days</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {daysOfWeek.map((day) => (
                          <button
                            key={day.num}
                            onClick={() => {
                              const daysOfWeek = programDraft?.daysOfWeek.includes(day.num)
                                ? programDraft.daysOfWeek.filter((d) => d !== day.num)
                                : [...(programDraft?.daysOfWeek || []), day.num];
                              setProgramDraft({ ...programDraft!, daysOfWeek });
                            }}
                            className={`px-2 py-1 text-sm rounded-md ${
                              programDraft?.daysOfWeek.includes(day.num)
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {day.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{DateTime.fromISO(program.startTime).toFormat('hh:mm a')}</p>
                      <p className="text-sm text-gray-500">
                        {program.daysOfWeek
                          .sort((a, b) => a - b)
                          .map((day) => daysOfWeek.find((d) => d.num === day)?.name)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
