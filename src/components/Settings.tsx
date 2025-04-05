import React from 'react';
import { Bell, Cpu, Database, Globe, Mail, Shield, Sliders, Wifi } from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsProps {
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
}

export function Settings({ settings, onUpdateSettings }: SettingsProps) {
  const [activeSection, setActiveSection] = React.useState('general');

  const handleChange = (section: string, key: string, value: any) => {
    onUpdateSettings({
      ...settings,
      [section]: {
        // ...settings[section],
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm border rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x">
          {/* Settings Navigation */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveSection('general')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'general'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Sliders className="h-5 w-5" />
              <span>General</span>
            </button>
            <button
              onClick={() => setActiveSection('hardware')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'hardware'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Cpu className="h-5 w-5" />
              <span>Hardware</span>
            </button>
            <button
              onClick={() => setActiveSection('network')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'network'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Wifi className="h-5 w-5" />
              <span>Network</span>
            </button>
            <button
              onClick={() => setActiveSection('weather')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'weather'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Globe className="h-5 w-5" />
              <span>Weather Service</span>
            </button>
            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'notifications'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => setActiveSection('database')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'database'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Database className="h-5 w-5" />
              <span>Database</span>
            </button>
            <button
              onClick={() => setActiveSection('security')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'security'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Shield className="h-5 w-5" />
              <span>Security</span>
            </button>
          </nav>

          {/* Settings Content */}
          <div className="p-6 col-span-3">
            {activeSection === 'general' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">General Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">System Name</label>
                    <input
                      type="text"
                      value={settings.general.systemName}
                      onChange={(e) => handleChange('general', 'systemName', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time Zone</label>
                    <select
                      value={settings.general.timeZone}
                      onChange={(e) => handleChange('general', 'timeZone', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Temperature Unit</label>
                    <div className="mt-1 space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="celsius"
                          checked={settings.general.temperatureUnit === 'celsius'}
                          onChange={(e) => handleChange('general', 'temperatureUnit', e.target.value)}
                          className="form-radio text-blue-600"
                        />
                        <span className="ml-2">Celsius</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="fahrenheit"
                          checked={settings.general.temperatureUnit === 'fahrenheit'}
                          onChange={(e) => handleChange('general', 'temperatureUnit', e.target.value)}
                          className="form-radio text-blue-600"
                        />
                        <span className="ml-2">Fahrenheit</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'hardware' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Hardware Configuration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">LCD Display I2C Address</label>
                    <input
                      type="text"
                      value={settings.hardware.lcdAddress}
                      onChange={(e) => handleChange('hardware', 'lcdAddress', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="0x27"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Moisture Sensor ADC I2C Address</label>
                    <input
                      type="text"
                      value={settings.hardware.moistureSensorAddress}
                      onChange={(e) => handleChange('hardware', 'moistureSensorAddress', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="0x48"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Moisture Reading Interval (minutes)</label>
                    <input
                      type="number"
                      value={settings.hardware.moistureReadingInterval}
                      onChange={(e) => handleChange('hardware', 'moistureReadingInterval', parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'network' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Network Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">MQTT Broker URL</label>
                    <input
                      type="text"
                      value={settings.network.mqttBroker}
                      onChange={(e) => handleChange('network', 'mqttBroker', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">MQTT Topic Prefix</label>
                    <input
                      type="text"
                      value={settings.network.mqttTopicPrefix}
                      onChange={(e) => handleChange('network', 'mqttTopicPrefix', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.network.mqttRetain}
                      onChange={(e) => handleChange('network', 'mqttRetain', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Retain MQTT Messages
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'weather' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Weather Service Configuration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Weather Service</label>
                    <select
                      value={settings.weather.service}
                      onChange={(e) => handleChange('weather', 'service', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="openweathermap">OpenWeatherMap</option>
                      <option value="weatherapi">WeatherAPI</option>
                      <option value="mock">Mock (Development)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">API Key</label>
                    <input
                      type="password"
                      value={settings.weather.apiKey}
                      onChange={(e) => handleChange('weather', 'apiKey', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      value={settings.weather.location}
                      onChange={(e) => handleChange('weather', 'location', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="City, Country or Coordinates"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Update Interval (minutes)</label>
                    <input
                      type="number"
                      value={settings.weather.updateInterval}
                      onChange={(e) => handleChange('weather', 'updateInterval', parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Notification Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Notifications</label>
                    <div className="mt-1 space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.emailEnabled}
                          onChange={(e) => handleChange('notifications', 'emailEnabled', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700">
                          Enable Email Notifications
                        </label>
                      </div>
                      {settings.notifications.emailEnabled && (
                        <div className="pl-6">
                          <input
                            type="email"
                            value={settings.notifications.emailAddress}
                            onChange={(e) => handleChange('notifications', 'emailAddress', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="email@example.com"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Notification Events</label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.notifyOnError}
                          onChange={(e) => handleChange('notifications', 'notifyOnError', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700">
                          System Errors
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.notifyOnWarning}
                          onChange={(e) => handleChange('notifications', 'notifyOnWarning', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700">
                          System Warnings
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.notifyOnZoneStart}
                          onChange={(e) => handleChange('notifications', 'notifyOnZoneStart', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700">
                          Zone Start/Stop
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'database' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Database Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Log Retention (days)</label>
                    <input
                      type="number"
                      value={settings.database.logRetentionDays}
                      onChange={(e) => handleChange('database', 'logRetentionDays', parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Backup Schedule</label>
                    <select
                      value={settings.database.backupSchedule}
                      onChange={(e) => handleChange('database', 'backupSchedule', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.database.compressBackups}
                      onChange={(e) => handleChange('database', 'compressBackups', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Compress Backups
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.security.requireAuth}
                      onChange={(e) => handleChange('security', 'requireAuth', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Require Authentication
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.security.enableAPIAccess}
                      onChange={(e) => handleChange('security', 'enableAPIAccess', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Enable API Access
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}