import React from 'react';
import { SystemLog } from './types';
import { mockWeatherService } from './mocks/weather';
import { ZoneManager } from './components/ZoneManager';
import { Dashboard } from './components/Dashboard';
import { SystemLogs } from './components/SystemLogs';
import Header from './components/Header';

function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  

  React.useEffect(() => {
    const updateWeather = async () => {
      const weather = await mockWeatherService.getCurrentWeather();


      // Add log entry for weather update
      const newLog: SystemLog = {
        id: Date.now(),
        timestamp: new Date(),
        type: 'INFO',
        message: `Weather updated: ${weather.forecast}, ${weather.temperature.toFixed(1)}°C`
      };

      // setSystemStatus(prev => ({
      //   ...prev,
      //   systemLogs: [...prev.systemLogs, newLog]
      // }));
    };

    updateWeather();
    const interval = setInterval(updateWeather, 300000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, []);

  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

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
          <Dashboard />
        )}
        {activeTab === 'zones' && (
          <ZoneManager />
        )}
        {activeTab === 'logs' && (
          <SystemLogs logs={[]} />
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