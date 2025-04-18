import { useEffect, useState } from 'react';
import { Droplets, Save, Undo, Edit2, Trash2, Plus, Waves } from 'lucide-react';
import { ValidPorts, Zone } from '../shared/zones';
import { remult } from 'remult';
import { useStatusContext } from '../hooks/StatusContext';
import { ZoneController } from '../server/controllers/ZoneController';

interface ZoneManagerProps {
  

}

const zoneRepo = remult.repo(Zone);

export function ZoneManager({}: ZoneManagerProps) {
  const [editingZone, setEditingZone] = useState<string>('');
  const [zones, setZones] = useState<Zone[]>([]);
  const [editBuffer, setEditBuffer] = useState<Partial<Zone> | null>(null);
  const systemStatus = useStatusContext();

  useEffect(() => {
    const subscription = zoneRepo.liveQuery().subscribe((info) =>
      setZones(info.applyChanges)
    );
    return subscription;
  }, []);

  const handleSaveZone = async () => {
    if (!editBuffer || !editingZone) return;
    try {
      await zoneRepo.update(editingZone, editBuffer as Zone);
      setEditingZone('');
      setEditBuffer(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelEdit = () => {
    setEditingZone('');
    setEditBuffer(null);
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      await zoneRepo.delete(zoneId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddZone = async () => {
    try {
      await zoneRepo.insert({
        name: 'New Zone',
        enabled: true,
        moistureLevel: 100,
        gpioPort: 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartZone = (zoneId: string) => ZoneController.runZone(zoneId, 30);
  const handleStopZone = () => ZoneController.requestActiveZoneStop();

  const renderZone = (zone: Zone) => {
    const isEditing = editingZone === zone.id;

    return (
      <div key={zone.id} className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <input
                type="text"
                value={editBuffer?.name || ''}
                onChange={(e) =>
                  setEditBuffer((prev) => ({ ...prev, name: e.target.value }))
                }
                className="border rounded px-2 py-1"
              />
            ) : (
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                {zone.name}
                {systemStatus?.activeZone?.id === zone.id && (
                  <Waves className="h-5 w-5 text-blue-500 ml-2" />
                )}
                {!zone.enabled && (
                   <span className="text-sm font-medium text-red-600 ml-2">Disabled</span>
                )}
              </h3>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              {isEditing ? (
                <input
                  type="number"
                  value={editBuffer?.moistureLevel || ''}
                  onChange={(e) =>
                    setEditBuffer((prev) => ({
                      ...prev,
                      moistureLevel: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="border rounded px-2 py-1 w-20"
                />
              ) : (
                <span className="text-sm text-gray-600">
                  {zone.moistureLevel}% Moisture
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <label
                htmlFor={`gpio-port-${zone.id}`}
                className="text-sm text-gray-600"
              >
                GPIO Port:
              </label>
              {isEditing ? (
                <select
                  id={`gpio-port-${zone.id}`}
                  value={editBuffer?.gpioPort || ''}
                  onChange={(e) =>
                    setEditBuffer((prev) => ({
                      ...prev,
                      gpioPort: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="border rounded px-2 py-1 w-20"
                >
                  {ValidPorts.sort((a, b) => a - b).map((port) => (
                    <option key={port} value={port}>
                      {port}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-gray-600">
                  {zone.gpioPort || 'N/A'}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
             
            {isEditing && (<> <label
                htmlFor={`enabled-${zone.id}`}
                className="text-sm text-gray-600"
              >
                Enabled:
              </label>
                <button
                  onClick={() =>
                    setEditBuffer((prev) => ({
                      ...prev,
                      enabled: !prev?.enabled,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors ${
                    editBuffer?.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ${
                      editBuffer?.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </>)}
            </div>

            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Cancel"
                >
                  <Undo className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSaveZone}
                  className="p-1 text-blue-400 hover:text-blue-600"
                  title="Save"
                >
                  <Save className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setEditBuffer(zone);
                  setEditingZone(isEditing ? '' : zone.id);
                }}
                className="p-1 text-green-400 hover:text-green-600"
                title="Edit"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => {
              if (window.confirm('Are you sure you want to delete this zone?')) {
                handleDeleteZone(zone.id);
              }
              }}
              className="p-1 text-red-400 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {systemStatus?.activeZone?.id !== zone.id ? (
            !isEditing && (
              <button
              onClick={() => handleStartZone(zone.id)}
              className={`px-2 py-1 text-sm rounded-md ${
                zone.enabled
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
              disabled={!zone.enabled}
              title="Run Zone"
              >
              Run
              </button>
            )
          ) : (
            <button
              onClick={handleStopZone}
              className="px-2 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              title="Stop Zone"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Irrigation Zones</h2>
        <button
          onClick={handleAddZone}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          title="Add Zone"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Zone
        </button>
      </div>

      <div className="grid gap-6">{zones.map(renderZone)}</div>
    </div>
  );
}
