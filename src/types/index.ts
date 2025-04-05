
export interface Schedule {
  id: number;
  zoneId: number;
  startTime: string; // HH:mm format
  duration: number; // minutes
  days: string[]; // ['monday', 'wednesday', etc.]
  enabled: boolean;
}


// export interface SystemStatus {
//   operational: boolean;
//   lastUpdate: Date;
//   systemLogs: SystemLog[];
// }

export interface SystemLog {
  id: number;
  timestamp: Date;
  type: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  zoneId?: number;
}

export interface SystemSettings {
  general: {
    systemName: string;
    timeZone: string;
    temperatureUnit: 'celsius' | 'fahrenheit';
  };
  hardware: {
    lcdAddress: string;
    moistureSensorAddress: string;
    moistureReadingInterval: number;
  };
  network: {
    mqttBroker: string;
    mqttTopicPrefix: string;
    mqttRetain: boolean;
  };
  weather: {
    service: 'openweathermap' | 'weatherapi' | 'mock';
    apiKey: string;
    location: string;
    updateInterval: number;
  };
  notifications: {
    emailEnabled: boolean;
    emailAddress: string;
    notifyOnError: boolean;
    notifyOnWarning: boolean;
    notifyOnZoneStart: boolean;
  };
  database: {
    logRetentionDays: number;
    backupSchedule: 'daily' | 'weekly' | 'monthly' | 'never';
    compressBackups: boolean;
  };
  security: {
    sessionTimeout: number;
    requireAuth: boolean;
    enableAPIAccess: boolean;
  };
}