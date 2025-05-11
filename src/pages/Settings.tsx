import React, { useEffect, useState } from 'react';
import { Bell, Cpu, Database, Globe, Shield, Sliders, Wifi } from 'lucide-react';
import { remult } from 'remult';
import { SystemSettings } from '../shared/systemSettings';
import { useStatusContext } from '../hooks/StatusContext';

interface SettingsProps {

}

export function Settings({ }: SettingsProps) {
  const [activeSection, setActiveSection] = React.useState('general');
  const [settings, setSettings] = useState<SystemSettings>();
  const [isDirty, setIsDirty] = useState(false);
  const settingsRepo = remult.repo(SystemSettings);

  useEffect(() => {
    const subscription = settingsRepo
      .liveQuery({ where: { id: 0 } })
      .subscribe((info) => {
        const items = info.applyChanges([]);
        if (items?.length > 0) {
          setSettings(items[0]);
        }
      });

    return subscription;
  }, []);

  const handleChange = (key: string, value: any) => {
    if (!settings) return;

    const parsedValue = parseValue(key, value);

    let updatedSettings;
    if (key.includes('.')) {
      const keys = key.split('.');
      updatedSettings = { ...settings };
      let currentLevel = updatedSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        const currentKey = keys[i];
        (currentLevel as any)[currentKey] = (currentLevel as any)[currentKey] || {};
        currentLevel = (currentLevel as Record<string, any>)[currentKey];
      }

      (currentLevel as any)[keys[keys.length - 1]] = value;
    } else {
      updatedSettings = { ...settings, [key]: parsedValue };
    }

    setSettings(updatedSettings);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!settings) return;

    settingsRepo
      .save(settings)
      .then((savedSettings) => {
        setSettings(savedSettings);
        setIsDirty(false);
      })
      .catch((error) => console.error('Error saving settings:', error));
  };

  const parseValue = (key: string, value: any) => {
    const intKeys = [
      'lcdAddress',
      'moistureSensorAddress',
      'moistureReadingInterval',
      'weatherUpdateInterval',
      'moistureSensorCalibration',
      'moistureSensorReadingInterval',
      'updateInterval',
    ];
    const trimKeys = [
      'weatherLocation',
      'weatherApiKey',
      'location',
      'apiKey',
      'timeZone',
      'lcdAddress',
    ];

    if (intKeys.includes(key)) return parseInt(value, key.includes('Address') ? 16 : 10);
    if (trimKeys.includes(key)) return value.trim();
    if (key === 'temperatureUnit') return value.toUpperCase();
    if (key === 'weatherService') return value.toLowerCase();

    return value;
  };

  if (!settings) return 'Loading...';

  const sections = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'hardware', label: 'Hardware', icon: Cpu },
    { id: 'network', label: 'Network', icon: Wifi },
    { id: 'weather', label: 'Weather Service', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'pwa', label: 'App', icon: Globe },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSettings settings={settings} onChange={handleChange} />;
      case 'hardware':
        return <HardwareSettings settings={settings} onChange={handleChange} />;
      case 'weather':
        return <WeatherSettings settings={settings} onChange={handleChange} />;
      case 'pwa':
        return <PWASettings />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm border rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x">
          <nav className="p-4 space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${activeSection === id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="p-6 col-span-3">
            {renderSectionContent()}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSave}
                disabled={!isDirty}
                className={`px-3 py-1 rounded-md text-sm ${isDirty
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="pt-4 text-center text-gray-300 text-xs">
        <a
          href="/display"
          className="inline-block text-gray-300 hover:underline text-xs font-normal"
        >
          Display View
        </a> |       <a
          href="/logs"
          className="inline-block text-gray-300 hover:underline text-xs font-normal"
        >
          System Logs
        </a> |       
        <button
          onClick={() => {
            fetch('/api/system/reboot', { method: 'POST' })
              .then((response) => {
          if (response.ok) {
            alert('Server is rebooting...');
          } else {
            alert('Failed to reboot the server.');
          }
              })
              .catch(() => alert('Failed to reboot the server.'));
          }}
          className="inline-block text-gray-300 hover:underline text-xs font-normal"
        >
          Reboot Server
        </button> | 
        <button
          onClick={() => {
            fetch('/api/system/restart-app', { method: 'POST' })
              .then((response) => {
          if (response.ok) {
            alert('Service is restarting...');
          } else {
            alert('Failed to restart the service.');
          }
              })
              .catch(() => alert('Failed to restart the service.'));
          }}
          className="inline-block text-gray-300 hover:underline text-xs font-normal"
        >
          Restart Service
        </button>
      </div>
    </div>
  );
}

const GeneralSettings = ({ settings, onChange }: { settings: SystemSettings; onChange: (key: string, value: any) => void }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-medium text-gray-900">General Settings</h2>
    <div className="space-y-4">
      <SettingSelect
        label="Time Zone"
        value={settings.timezone}
        options={[
          { value: 'UTC', label: 'UTC' },
          { value: 'America/New_York', label: 'Eastern Time' },
          { value: 'America/Chicago', label: 'Central Time' },
          { value: 'America/Denver', label: 'Mountain Time' },
          { value: 'America/Los_Angeles', label: 'Pacific Time' },
        ]}
        onChange={(value) => onChange('timeZone', value)}
      />
      <SettingRadio
        label="Temperature Unit"
        name="temperatureUnit"
        options={[
          { value: 'F', label: 'Fahrenheit' },
          { value: 'C', label: 'Celsius' },
        ]}
        value={settings.temperatureUnit}
        onChange={(value) => onChange('temperatureUnit', value)}
      />
      <SettingRadio
        label="Measurement Unit"
        name="measurementUnit"
        options={[
          { value: 'imperial', label: 'Imperial' },
          { value: 'metric', label: 'Metric' },
        ]}
        value={settings.measurementUnit}
        onChange={(value) => onChange('measurementUnit', value)}
      />
      <SettingInput
        label="History Snapshot Interval (minutes)"
        type="number"
        value={settings.historySnapshotInterval || ''}
        onChange={(value) => onChange('historySnapshotInterval', value)}
        placeholder="Enter interval in minutes"
      />
    </div>
  </div>
);

const PWASettings = () => {

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">PWA Settings</h2>
      <div className="space-y-4">

        <div className="install-banner bg-yellow-300 text-black p-2 w-full flex justify-between items-center">
          <p className="mr-4 text-sm">
            To install the app, open the browser menu and select "Add to Home Screen".
          </p>
        </div>

      </div>
    </div>
  );

  // return (<InstallButton />);
};

const HardwareSettings = ({ settings, onChange }: { settings: SystemSettings; onChange: (key: string, value: any) => void }) => {
  
  const systemStatus = useStatusContext();
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Hardware Configuration</h2>
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-gray-700 mb-2">LCD</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border bg-blue-50 p-4 rounded-md">
          <div>
            <SettingHexInput
              label="LCD Display I2C Address"
              value={settings.lcdSettings?.i2cAddress}
              onChange={(value) => onChange('lcdSettings.i2cAddress', value)}
              placeholder="0x27"
            />
            <SettingInput
              label="LCD Page Cycle Time (seconds)"
              type="number"   
              value={settings.lcdSettings?.pageCycleTimeSeconds}
              onChange={(value) => onChange('lcdSettings.pageCycleTimeSeconds', value)}
              placeholder="Enter page cycle time in seconds"
            />
          </div>
          <div>
            <SettingInput
              label="LCD Rows"
              type="number"
              value={settings.lcdSettings?.rows || ''}
              onChange={(value) => onChange('lcdSettings.rows', value)}
              placeholder="Enter number of rows"
            />  
            <SettingInput
              label="LCD Columns"
              type="number"
              value={settings.lcdSettings?.cols || ''}
              onChange={(value) => onChange('lcdSettings.cols', value)}
              placeholder="Enter number of columns"
            />
          </div>
        </div>
        <hr className="my-6 border-t border-gray-300" />
        <h3 className="text-md font-semibold text-gray-700 mb-2">Sensors</h3>
        <SettingHexInput
          label="Analog Digital Converter I2C Address"
          value={settings.analogDigitalAddress}
          onChange={(value) => onChange('analogDigitalAddress', value)}
          placeholder="0x48"
        />
        <SettingInput
          label="Sensor Reference Voltage"
          type="number"
          value={settings.sensorReferenceVoltage || ''}
          onChange={(value) => onChange('sensorReferenceVoltage', value)}
          placeholder="Enter sensor reference voltage"
        />
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-800">Sensors</h3>
          {settings.sensors?.map((sensor, index) => (
            <div key={index}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border bg-blue-50 p-4 rounded-md">
                <div>
                  <SettingInput
                    label="Sensor Name"
                    value={sensor.name}
                    onChange={(value) => onChange(`sensors.${index}.name`, value)}
                    placeholder="Enter sensor name"
                  />
                  <SettingSelect
                    label="Sensor Type"
                    value={sensor.sensorType}
                    options={[
                      { value: 'moisture', label: 'Moisture' },
                      { value: 'temperature', label: 'Temperature' },
                      { value: 'humidity', label: 'Humidity' },
                    ]}
                    onChange={(value) => onChange(`sensors.${index}.sensorType`, value)}
                  />
                  <SettingInput
                    label="Analog Port"
                    type="number"
                    value={sensor.analogPort}
                    onChange={(value) => onChange(`sensors.${index}.analogPort`, value)}
                    placeholder="Enter analog port number"
                  />
                  <SettingRadio
                    label="Read Method"
                    name={`sensors.${index}.readMethod`}
                    options={[
                      { value: 'single', label: 'Single' },
                      { value: 'averageFive', label: 'Average of 5' },
                    ]}
                    value={sensor.readMethod}
                    onChange={(value) => onChange(`sensors.${index}.readMethod`, value)}
                  />
                  <SettingRadio
                    label="Inverted"
                    name={`sensors.${index}.inverted`}
                    options={[
                      { value: 'false', label: 'No' },
                      { value: 'true', label: 'Yes' },
                    ]}
                    value={sensor.inverted ? 'true' : 'false'}
                    onChange={(value) => onChange(`sensors.${index}.inverted`, value === 'true')}
                  />
                </div>
                <div>
                  <SettingInput
                    label="Min Analog Value"
                    type="number"
                    value={sensor.minAnalogValue}
                    onChange={(value) => onChange(`sensors.${index}.minAnalogValue`, value)}
                    placeholder="Enter minimum analog value"
                  />
                  <SettingInput
                    label="Max Analog Value"
                    type="number"
                    value={sensor.maxAnalogValue}
                    onChange={(value) => onChange(`sensors.${index}.maxAnalogValue`, value)}
                    placeholder="Enter maximum analog value"
                  />
                  <SettingSelect
                    label="Read Value As"
                    value={sensor.readValueAs}
                    options={[
                      { value: 'raw', label: 'Raw' },
                      { value: 'voltage', label: 'Voltage' },
                      { value: 'percent', label: 'Percent' },
                    ]}
                    onChange={(value) => onChange(`sensors.${index}.readValueAs`, value)}
                  />
                  <SettingInput
                    label="Read Frequency (seconds)"
                    type="number"
                    value={sensor.readFrequencySeconds}
                    onChange={(value) => onChange(`sensors.${index}.readFrequencySeconds`, value)}
                    placeholder="Enter read frequency in seconds"
                  />
                    <div className="mt-4 bg-green-400 p-4 rounded-md shadow-sm">
                      <label className="block text-sm font-medium text-gray-700">Current Raw Value</label>
                      <p className="mt-1 text-sm text-gray-900 font-semibold">
                      {systemStatus?.sensorData?.[sensor.name]?.rawValue ?? 'N/A'}
                      </p>
                    </div>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 flex justify-end">
                <button
                  onClick={() => {
                    const updatedSensors = [...(settings.sensors || [])];
                    updatedSensors.splice(index, 1);
                    onChange('sensors', updatedSensors);
                  }}
                  className="text-red-600 hover:underline text-sm"
                >
                  Remove Sensor
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              const newSensor = {
                name: '',
                sensorType: 'moisture',
                analogPort: 0,
                minAnalogValue: 0,
                maxAnalogValue: 32767,
                readValueAs: 'raw',
                readFrequencySeconds: 15,
                readMethod: 'single',
                inverted: false,
              };
              onChange('sensors', [...(settings.sensors || []), newSensor]);
            }}
            className="text-blue-600 hover:underline text-sm"
          >
            Add Sensor
          </button>
        </div>
      </div>
    </div>
  );
};

const WeatherSettings = ({ settings, onChange }: { settings: SystemSettings; onChange: (key: string, value: any) => void }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-medium text-gray-900">Weather Service Configuration</h2>
    <div className="space-y-4">
      <SettingSelect
        label="Weather Service"
        value={settings.weatherService}
        options={[
          { value: 'weatherapi', label: 'WeatherAPI' },
          { value: 'openweathermap', label: 'OpenWeatherMap' },
        ]}
        onChange={(value) => onChange('weatherService', value)}
      />

      <div className="space-y-4">
        <h3 className="text-md font-medium text-gray-800">WeatherAPI Settings</h3>
        <SettingInput
          label="API Key"
          type="password"
          value={settings.weatherServiceSettings?.weatherapi?.apiKey || ''}
          onChange={(value) => onChange('weatherServiceSettings.weatherapi.apiKey', value)}
        />
        <SettingInput
          label="Location"
          value={settings.weatherServiceSettings?.weatherapi?.location || ''}
          onChange={(value) => onChange('weatherServiceSettings.weatherapi.location', value)}
          placeholder="Enter location (lat,lon), zip code or city, state"
        />
        <SettingInput
          label="Update Interval (minutes)"
          type="number"
          value={settings.weatherServiceSettings?.weatherapi?.updateInterval || ''}
          onChange={(value) => onChange('weatherServiceSettings.weatherapi.updateInterval', value)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-md font-medium text-gray-800">OpenWeatherMap Settings</h3>
        <SettingInput
          label="API Key"
          type="password"
          value={settings.weatherServiceSettings?.openweathermap?.apiKey || ''}
          onChange={(value) => onChange('weatherServiceSettings.openweathermap.apiKey', value)}
        />
        <SettingInput
          label="Location"
          value={settings.weatherServiceSettings?.openweathermap?.location || ''}
          onChange={(value) => onChange('weatherServiceSettings.openweathermap.location', value)}
          placeholder="Enter location (lat,lon) or zip code"
        />

        <SettingInput
          label="Update Interval (minutes)"
          type="number"
          value={settings.weatherServiceSettings?.openweathermap?.updateInterval || ''}
          onChange={(value) => onChange('weatherServiceSettings.openweathermap.updateInterval', value)}
        />
      </div>
    </div>
    
  </div>
);

const SettingHexInput = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      type="text"
      value={value ? `0x${value.toString(16).toUpperCase()}` : '0x'}
      onChange={(e) => {
        let sanitizedValue = e.target.value.toLowerCase().startsWith('0x') ? e.target.value : `0x${e.target.value}`;
        sanitizedValue = sanitizedValue.replace(/[^0-9a-f]/gi, '').toLowerCase();
        if (!sanitizedValue.startsWith('0x')) {
          sanitizedValue = `0x${sanitizedValue}`;
        }
        const upperCaseValue = sanitizedValue.slice(0, 2) + sanitizedValue.slice(2).toUpperCase();
        const parsedValue = upperCaseValue === '0x' ? NaN : parseInt(upperCaseValue, 16);

        // Allow "0x0" to be typed and trigger onChange
        if (upperCaseValue === '0x0' || (!isNaN(parsedValue) && parsedValue >= 0x00 && parsedValue <= 0x7F)) {
          onChange(parsedValue || 0x00);
        }
      }}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      placeholder={placeholder}
    />
  </div>
);

const SettingInput = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      placeholder={placeholder}
    />
  </div>
);

const SettingSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: any;
  options: { value: string; label: string }[];
  onChange: (value: any) => void;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const SettingRadio = ({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value: any;
  onChange: (value: any) => void;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="mt-1 space-x-4">
      {options.map((option) => (
        <label key={option.value} className="inline-flex items-center">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="form-radio text-blue-600"
          />
          <span className="ml-2">{option.label}</span>
        </label>
      ))}
    </div>
  </div>
);
