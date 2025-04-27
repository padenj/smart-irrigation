import { ZoneManager } from './pages/ZoneManager';
import { Dashboard } from './pages/Dashboard';
import { SystemLogs } from './pages/SystemLogs';
import Header from './components/Header';
import { ProgramManager } from './pages/ProgramManager';
import { Settings } from './pages/Settings';
import { StatusProvider } from './hooks/StatusContext';
import { SettingsProvider } from './hooks/SettingsContext';
import { VersionDisplay } from './components/VersionDisplay';
import { InstallButton } from './components/InstallAppButton';
import { BrowserRouter as Router, Route, Routes, NavLink } from 'react-router-dom';
import HistoricalStatusPage from './pages/HistoricalStatus';

function App() {
  return (
    <Router>
    <div className="min-h-screen bg-gray-50">
      <SettingsProvider>
        <StatusProvider>
          {/* Header */}
          <Header />

          {/* Navigation */}
          <nav className="bg-white border-b overflow-x-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-8">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/zones"
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`
                  }
                >
                  Zones
                </NavLink>
                <NavLink
                  to="/programs"
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`
                  }
                >
                  Programs
                </NavLink>
                <NavLink
                  to="/logs"
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`
                  }
                >
                  System Logs
                </NavLink>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`
                  }
                >
                  Settings
                </NavLink>

                <NavLink
                  to="/history"
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`
                  }
                >
                  History
                </NavLink>
              </div>
            </div>
          </nav>

          {/* Main Content */}

          <InstallButton />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/zones" element={<ZoneManager />} />
                <Route path="/programs" element={<ProgramManager />} />
                <Route path="/logs" element={<SystemLogs />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/history" element={<HistoricalStatusPage />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
          </main>

          {/* Footer */}
          <footer className="bottom-0 right-0 m-4">
            <VersionDisplay />
          </footer>
        </StatusProvider>
      </SettingsProvider>
    </div>
    </Router>
  );
}

export default App;