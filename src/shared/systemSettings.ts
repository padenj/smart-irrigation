
export interface WeatherServiceSettings {
    apiKey: string;
    location: string;
    updateInterval: number;
    data?: unknown;
}

export interface SensorSettings {
    name: string
    sensorType: 'moisture' | 'temperature' | 'humidity',
    analogPort: number,
    minAnalogValue: number 
    maxAnalogValue: number,
    readValueAs: 'raw' | 'voltage' | 'percent',
    readFrequencySeconds: number,
    readMethod: 'single' | 'averageFive'
    inverted: boolean,
}

export interface LCDSettings {
    rows: number;
    cols: number;
    pageCycleTimeSeconds: number; // Time in milliseconds to cycle through LCD pages
    i2cAddress: number; // I2C address for the AtoD converter
}

export interface SystemSettings {
    id: number;
    timezone: string;
    temperatureUnit: 'F' | 'C'; // F or C
    measurementUnit: 'imperial' | 'metric'; // imperial or metric
    weatherService: 'weatherapi' | 'openweathermap'; // openmateo or weatherapi
    weatherServiceSettings: {
        weatherapi?: WeatherServiceSettings,
        openweathermap?: WeatherServiceSettings
    };
    sensorReferenceVoltage: number; // Voltage reference for the AtoD converter
    analogDigitalAddress: number; // I2C address for the LCD display
    sensors: SensorSettings[];
    historySnapshotInterval: number; // Interval in seconds for saving system status snapshots
    lcdSettings: LCDSettings;
}
