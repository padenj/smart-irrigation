import React, { useEffect, useState } from 'react';
import { Bell, Cpu, Database, Globe, Shield, Sliders, Wifi } from 'lucide-react';
import { remult } from 'remult';
import { SystemSettings } from '../shared/systemSettings';

interface SettingsProps {
  
}

export function Settings({  }: SettingsProps) {
  const [activeSection, setActiveSection] = React.useState('general');
  const [settings, setSettings] = useState<SystemSettings>();
  const settingsRepo = remult.repo(SystemSettings);

  useEffect(() => {
    console.log("Settings component mounted");
      settingsRepo.liveQuery({ where: { id: 0 } }).subscribe(info => {
        const items = info.applyChanges([]);
        if (items?.length > 0) {    
          console.log("Settings items:", items);
          setSettings(items[0]);
        }
      });
  }, [])
  
  const handleChange = (key: string, value: any) => {
    console.log("Settings change:", key, value);
    if (!settings) return;
    if (key === 'lcdAddress' || key === 'moistureSensorAddress') {
      value = parseInt(value, 16);
    } else if (key === 'moistureReadingInterval') {
      value = parseInt(value);
    } else if (key === 'temperatureUnit') {
      value = value.toUpperCase();
    }
    if (key === 'weatherService') {
      value = value.toLowerCase();
    }
    if (key === 'weatherUpdateInterval') {
      value = parseInt(value);
    }
    if (key === 'moistureSensorCalibration') {
      value = parseInt(value);
    }
    if (key === 'moistureSensorReadingInterval') {
      value = parseInt(value);      
    }
    if (key === 'weatherLocation') {
      value = value.trim();
    }
    if (key === 'weatherApiKey') {
      value = value.trim();
    }
    if (key === 'latitude') {
      value = value.trim();
    }
    if (key === 'longitude') {      
      value = value.trim();
    }
    if (key === 'timeZone') {
      value = value.trim();
    }
    if (key === 'lcdAddress') {
      value = value.trim();
    }  
console.log('here');
    settingsRepo.save({
      ...settings,
      [key]: value,
    }).then((value) => {
      console.log("Settings saved:", value);
      setSettings(value);
    }).catch((error) => {
      console.error("Error saving settings:", error);
    });
    // Update the settings state

  };

  if (!settings) {
    return "Loading..."
  }

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
                    <label className="block text-sm font-medium text-gray-700">Time Zone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleChange('timeZone', e.target.value)}
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
                          value="C"
                          checked={settings.temperatureUnit === 'C'}
                          onChange={(e) => handleChange('temperatureUnit', e.target.value)}
                          className="form-radio text-blue-600"
                        />
                        <span className="ml-2">Celsius</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="F"
                          checked={settings.temperatureUnit === 'F'}
                          onChange={(e) => handleChange('temperatureUnit', e.target.value)}
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
                      value={settings.lcdAddress ? `0x${settings.lcdAddress.toString(16)}` : ''}
                      onChange={(e) => handleChange('lcdAddress', parseInt(e.target.value, 16).toString())}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="0x27"
                    />
                    </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Moisture Sensor ADC I2C Address</label>
                    <input
                      type="text"
                      value={settings.moistureSensorAddress ? `0x${settings.moistureSensorAddress.toString(16)}` : ''}
                      onChange={(e) => handleChange('moistureSensorAddress', parseInt(e.target.value, 16).toString())}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="0x48"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Moisture Reading Interval (minutes)</label>
                    <input
                      type="number"
                      value={settings.moistureSensorReadingInterval}
                      onChange={(e) => handleChange('moistureReadingInterval', parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Moisture Reading Interval (minutes)</label>
                    <input
                      type="number"
                      value={settings.moistureSensorCalibration}
                      onChange={(e) => handleChange('moistureReadingInterval', parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
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
                      value={settings.weatherService}
                      onChange={(e) => handleChange('service', e.target.value)}
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
                      value={settings.weatherApiKey}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Latitude</label>
                    <input
                      type="text"
                      value={settings.latitude}
                      onChange={(e) => handleChange('latitude', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter latitude"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Longitude</label>
                    <input
                      type="text"
                      value={settings.longitude}
                      onChange={(e) => handleChange('longitude', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter longitude"
                    />
                    </div>
                  <div> 
                    <label className="block text-sm font-medium text-gray-700">Update Interval (minutes)</label>
                    <input
                      type="number"
                      value={settings.weatherUpdateInterval}
                      onChange={(e) => handleChange('updateInterval', parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
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