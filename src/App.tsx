import React from 'react';
import { ZoneManager } from './components/ZoneManager';
import { Dashboard } from './components/Dashboard';
import { SystemLogs } from './components/SystemLogs';
import Header from './components/Header';
import { ProgramManager } from './components/ProgramManager';
import { Settings } from './components/Settings';
import { StatusProvider } from './components/StatusContext';
import { SettingsProvider } from './components/SettingsContext';
import { VersionDisplay } from './components/VersionDisplay';

function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Navigation */}
      <nav className="bg-white border-b overflow-x-auto">
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
          onClick={() => setActiveTab('programs')}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === 'programs'
          ? 'border-b-2 border-blue-500 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Programs
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
      <SettingsProvider>
        <StatusProvider>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeTab === 'dashboard' && (
              <Dashboard />
            )}
            {activeTab === 'zones' && (
              <ZoneManager />
            )}
            {activeTab === 'programs' && (
              <ProgramManager />
            )}
            {activeTab === 'logs' && (
              <SystemLogs />
            )}
            {activeTab === 'settings' && (
              <Settings />
            )}
          </main>
        </StatusProvider>
      </SettingsProvider>

      {/* Footer */}
      <footer className=" bottom-0 right-0 m-4">
        <VersionDisplay />
      </footer>
    </div>
  );
}

export default App;