import React, { useEffect, useState } from 'react';
import { Droplets, Edit2, Trash2, Plus } from 'lucide-react';
import { Zone } from '../shared/zones';
import { remult } from 'remult';

interface ZoneManagerProps {
  

}

const zoneRepo = remult.repo(Zone);

export function ZoneManager({  }: ZoneManagerProps) {
  const [editingZone, setEditingZone] = React.useState<number | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    return zoneRepo.liveQuery().subscribe((info) => setZones(info.applyChanges));
  }, [])
  // Zone management handlers
  const handleUpdateZone = async (updatedZone: Zone) => {
    try {
      await zoneRepo.update(updatedZone.id, updatedZone)
      setZones((zones) => zones.map((z) => (z.id === updatedZone.id ? updatedZone : z)))
    } catch (e) {
      console.log(e);
    }
    
  };

  const handleDeleteZone = async (zoneId: number) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;

    try {
      await zoneRepo.delete(zoneId);
      setZones((zones) => zones.filter(z => z.id !== zoneId))
    } catch (e) {
      console.log(e);
    }

  };

  const handleAddZone = async (newZone: Partial<Zone>) => {
    const zoneAdded = await zoneRepo.insert(newZone);
  };

  const handleToggleZone = (zone: Zone) => {
    const updatedZone = { ...zone, isActive: !zone.isActive };
    handleUpdateZone(updatedZone);

  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Irrigation Zones</h2>
        <button
          onClick={() => handleAddZone({ name: 'New Zone', enabled: true, moistureLevel: 0, isActive: false })}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Zone
        </button>
      </div>

      <div className="grid gap-6">
        {zones.map(zone => (
          <div key={zone.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              {editingZone === zone.id ? (
                <input
                  type="text"
                  value={zone.name}
                  onChange={(e) => handleUpdateZone({ ...zone, name: e.target.value })}
                  className="border rounded px-2 py-1"
                />
              ) : (
                <h3 className="text-lg font-medium text-gray-900">{zone.name}</h3>
              )}
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Droplets className="h-5 w-5 text-blue-500" />
                    {editingZone === zone.id ? (
                    <input
                      type="number"
                      value={zone.moistureLevel}
                      onChange={(e) => handleUpdateZone({ ...zone, moistureLevel: parseInt(e.target.value, 10) || 0 })}
                      className="border rounded px-2 py-1 w-20"
                    />
                    ) : (
                    <span className="text-sm text-gray-600">{zone.moistureLevel}% Moisture</span>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                  <label htmlFor={`gpio-port-${zone.id}`} className="text-sm text-gray-600">GPIO Port:</label>
                  {editingZone === zone.id ? (
                    <input
                      id={`gpio-port-${zone.id}`}
                      type="number"
                      value={zone.gpioPort || ''}
                      onChange={(e) => handleUpdateZone({ ...zone, gpioPort: parseInt(e.target.value, 10) || 0 })}
                      className="border rounded px-2 py-1 w-20"
                    />
                  ) : (
                    <span className="text-sm text-gray-600">{zone.gpioPort || 'N/A'}</span>
                  )}
                </div>
                
                <button
                  onClick={() => handleUpdateZone({ ...zone, enabled: !zone.enabled })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    zone.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    zone.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>

                <button
                  onClick={() => setEditingZone(editingZone === zone.id ? null : zone.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleDeleteZone(zone.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            
          </div>
        ))}
      </div>
    </div>
  );
}