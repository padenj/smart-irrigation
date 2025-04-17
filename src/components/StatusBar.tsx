import React, {  } from 'react';
import { Cloud } from 'lucide-react';
import { useSettingsContext } from './SettingsContext';
import { useStatusContext } from './StatusContext';

const Status: React.FC = () => {
    const systemStatus = useStatusContext();
    const systemSettings = useSettingsContext();

    if (!systemStatus) {
        return "Loading..."
    }

    return (
        <>
            <Cloud className="h-5 w-5" />
            <span>{systemStatus?.weatherData?.current.temperature?.toFixed(1)}°{systemSettings.temperatureUnit}</span>
            <span>{systemStatus?.weatherData?.current.relativeHumidity?.toFixed(0)}% RH</span>
        </>
    );
};

export default Status;