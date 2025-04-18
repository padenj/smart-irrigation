import React, { useEffect, useState } from 'react';
import { Bell, Cpu, Database, Globe, Shield, Sliders, Wifi } from 'lucide-react';
import { remult } from 'remult';
import { SystemSettings } from '../shared/systemSettings';
import { InstallButton } from '../components/InstallAppButton';

interface SettingsProps {
  
}

export function Settings({}: SettingsProps) {
  const [activeSection, setActiveSection] = React.useState('pwa');
  const [settings, setSettings] = useState<SystemSettings>();
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

    settingsRepo
      .save({ ...settings, [key]: parsedValue })
      .then((updatedSettings) => setSettings(updatedSettings))
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
    ];
    const trimKeys = [
      'weatherLocation',
      'weatherApiKey',
      'latitude',
      'longitude',
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
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="p-6 col-span-3">{renderSectionContent()}</div>
        </div>
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
          { value: 'C', label: 'Celsius' },
          { value: 'F', label: 'Fahrenheit' },
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
    </div>
  </div>
);

const PWASettings = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  //const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      console.log('beforeinstallprompt event fired');
      //setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      console.log('App installed event fired');
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // const handleInstallClick = () => {
  //   if (deferredPrompt) {
  //     deferredPrompt.prompt();
  //     deferredPrompt.userChoice.then((choiceResult: any) => {
  //       if (choiceResult.outcome === 'accepted') {
  //         console.log('User accepted the install prompt');
  //       } else {
  //         console.log('User dismissed the install prompt');
  //       }
  //       setDeferredPrompt(null);
  //     });
  //   }
  // };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">PWA Settings</h2>
      <div className="space-y-4">
        {isInstalled ? (
          <p className="text-green-600">App is installed on your device</p>
        ) : (
          <div className="install-banner bg-yellow-300 text-black p-2 w-full flex justify-between items-center">
                <p className="mr-4 text-sm">
                    To install the app, open the browser menu and select "Add to Home Screen".
                </p>
            </div>
        )}
      </div>
    </div>
  );

  // return (<InstallButton />);
};

const HardwareSettings = ({ settings, onChange }: { settings: SystemSettings; onChange: (key: string, value: any) => void }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-medium text-gray-900">Hardware Configuration</h2>
    <div className="space-y-4">
      <SettingInput
        label="LCD Display I2C Address"
        value={settings.lcdAddress ? `0x${settings.lcdAddress.toString(16)}` : ''}
        onChange={(value) => onChange('lcdAddress', value)}
        placeholder="0x27"
      />
      <SettingInput
        label="Moisture Sensor ADC I2C Address"
        value={settings.moistureSensorAddress ? `0x${settings.moistureSensorAddress.toString(16)}` : ''}
        onChange={(value) => onChange('moistureSensorAddress', value)}
        placeholder="0x48"
      />
      <SettingInput
        label="Moisture Reading Interval (minutes)"
        type="number"
        value={settings.moistureSensorReadingInterval}
        onChange={(value) => onChange('moistureSensorReadingInterval', value)}
      />
      <SettingInput
        label="Moisture Sensor Calibration"
        type="number"
        value={settings.moistureSensorCalibration}
        onChange={(value) => onChange('moistureSensorCalibration', value)}
      />
    </div>
  </div>
);

const WeatherSettings = ({ settings, onChange }: { settings: SystemSettings; onChange: (key: string, value: any) => void }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-medium text-gray-900">Weather Service Configuration</h2>
    <div className="space-y-4">
      <SettingSelect
        label="Weather Service"
        value={settings.weatherService}
        options={[
          { value: 'weatherapi', label: 'WeatherAPI' },
          { value: 'openmateo', label: 'OpenMateo (Forecast Only)' },
        ]}
        onChange={(value) => onChange('weatherService', value)}
      />
      <SettingInput
        label="API Key"
        type="password"
        value={settings.weatherApiKey}
        onChange={(value) => onChange('weatherApiKey', value)}
      />
      <SettingInput
        label="Latitude"
        value={settings.latitude}
        onChange={(value) => onChange('latitude', value)}
        placeholder="Enter latitude"
      />
      <SettingInput
        label="Longitude"
        value={settings.longitude}
        onChange={(value) => onChange('longitude', value)}
        placeholder="Enter longitude"
      />
      <SettingInput
        label="Update Interval (minutes)"
        type="number"
        value={settings.weatherUpdateInterval}
        onChange={(value) => onChange('weatherUpdateInterval', value)}
      />
    </div>
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
