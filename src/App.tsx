import React from 'react';
import { Cloud, Droplets } from 'lucide-react';
import { SystemStatus, Zone, SystemLog } from './types';
import { mockWeatherService } from './mocks/weather';
import { mockHardware } from './mocks/hardware';
import { ZoneManager } from './components/ZoneManager';
import { Dashboard } from './components/Dashboard';
import { SystemLogs } from './components/SystemLogs';

function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [systemStatus, setSystemStatus] = React.useState<SystemStatus>({
    operational: true,
    lastUpdate: new Date(),
    weatherData: {
      temperature: 0,
      humidity: 0,
      isRaining: false,
      precipitation: 0,
      forecast: 'Loading...'
    },
    zones: [
      {
        id: 1,
        name: 'Front Lawn',
        enabled: true,
        schedule: [
          {
            id: 1,
            zoneId: 1,
            startTime: '06:00',
            duration: 20,
            days: ['monday', 'wednesday', 'friday'],
            enabled: true
          }
        ],
        lastWatered: null,
        moistureLevel: 45,
        isActive: false
      },
      {
        id: 2,
        name: 'Vegetable Garden',
        enabled: true,
        schedule: [
          {
            id: 1,
            zoneId: 2,
            startTime: '07:00',
            duration: 15,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            enabled: true
          }
        ],
        lastWatered: null,
        moistureLevel: 60,
        isActive: false
      }
    ],
    systemLogs: [
      {
        id: 1,
        timestamp: new Date(Date.now() - 300000),
        type: 'INFO',
        message: 'System started successfully'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 240000),
        type: 'INFO',
        message: 'Weather data updated',
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 180000),
        type: 'WARNING',
        message: 'Zone 1 moisture level below threshold',
        zoneId: 1
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 120000),
        type: 'INFO',
        message: 'Zone 2 watering completed',
        zoneId: 2
      },
      {
        id: 5,
        timestamp: new Date(Date.now() - 60000),
        type: 'ERROR',
        message: 'Failed to read moisture sensor',
        zoneId: 1
      }
    ]
  });

  React.useEffect(() => {
    const updateWeather = async () => {
      const weather = await mockWeatherService.getCurrentWeather();
      setSystemStatus(prev => ({
        ...prev,
        weatherData: weather,
        lastUpdate: new Date()
      }));

      // Add log entry for weather update
      const newLog: SystemLog = {
        id: Date.now(),
        timestamp: new Date(),
        type: 'INFO',
        message: `Weather updated: ${weather.forecast}, ${weather.temperature.toFixed(1)}°C`
      };

      setSystemStatus(prev => ({
        ...prev,
        systemLogs: [...prev.systemLogs, newLog]
      }));
    };

    updateWeather();
    const interval = setInterval(updateWeather, 300000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Zone management handlers
  const handleUpdateZone = (updatedZone: Zone) => {
    setSystemStatus(prev => ({
      ...prev,
      zones: prev.zones.map(zone => 
        zone.id === updatedZone.id ? updatedZone : zone
      )
    }));

    // Update LCD display
    mockHardware.updateLCD([
      'Zone Updated:',
      updatedZone.name,
      `Enabled: ${updatedZone.enabled}`,
      `Moisture: ${updatedZone.moistureLevel}%`
    ]);

    // Log the change
    const newLog: SystemLog = {
      id: Date.now(),
      timestamp: new Date(),
      type: 'INFO',
      message: `Zone "${updatedZone.name}" updated`,
      zoneId: updatedZone.id
    };

    setSystemStatus(prev => ({
      ...prev,
      systemLogs: [...prev.systemLogs, newLog]
    }));
  };

  const handleDeleteZone = (zoneId: number) => {
    const zone = systemStatus.zones.find(z => z.id === zoneId);
    if (!zone) return;

    setSystemStatus(prev => ({
      ...prev,
      zones: prev.zones.filter(z => z.id !== zoneId),
      systemLogs: [...prev.systemLogs, {
        id: Date.now(),
        timestamp: new Date(),
        type: 'WARNING',
        message: `Zone "${zone.name}" deleted`,
        zoneId
      }]
    }));
  };

  const handleAddZone = (newZone: Partial<Zone>) => {
    const maxId = Math.max(0, ...systemStatus.zones.map(z => z.id));
    const zone: Zone = {
      id: maxId + 1,
      name: newZone.name || 'New Zone',
      enabled: newZone.enabled || false,
      schedule: [],
      lastWatered: null,
      moistureLevel: 0,
      isActive: false
    };

    setSystemStatus(prev => ({
      ...prev,
      zones: [...prev.zones, zone],
      systemLogs: [...prev.systemLogs, {
        id: Date.now(),
        timestamp: new Date(),
        type: 'INFO',
        message: `New zone "${zone.name}" created`,
        zoneId: zone.id
      }]
    }));
  };

  const handleToggleZone = (zone: Zone) => {
    const updatedZone = { ...zone, isActive: !zone.isActive };
    handleUpdateZone(updatedZone);

    // Log the action
    const newLog: SystemLog = {
      id: Date.now(),
      timestamp: new Date(),
      type: 'INFO',
      message: `Zone "${zone.name}" ${updatedZone.isActive ? 'activated' : 'deactivated'}`,
      zoneId: zone.id
    };

    setSystemStatus(prev => ({
      ...prev,
      systemLogs: [...prev.systemLogs, newLog]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Droplets className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">Smart Irrigation System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Cloud className="h-5 w-5" />
                <span>{systemStatus.weatherData.temperature.toFixed(1)}°C</span>
                <span>{systemStatus.weatherData.humidity.toFixed(0)}% RH</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === 'dashboard'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('zones')}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === 'zones'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Zones
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === 'logs'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              System Logs
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === 'settings'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            systemStatus={systemStatus}
            onToggleZone={handleToggleZone}
          />
        )}
        {activeTab === 'zones' && (
          <ZoneManager
            zones={systemStatus.zones}
            onUpdateZone={handleUpdateZone}
            onDeleteZone={handleDeleteZone}
            onAddZone={handleAddZone}
          />
        )}
        {activeTab === 'logs' && (
          <SystemLogs logs={systemStatus.systemLogs} />
        )}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center text-gray-500">
              <p className="text-lg">Settings</p>
              <p className="mt-2">Coming soon: System Settings and Configuration</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;