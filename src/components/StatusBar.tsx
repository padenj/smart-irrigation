import React, { useEffect, useState } from 'react';
import { useSettingsContext } from '../hooks/SettingsContext';
import { useStatusContext } from '../hooks/StatusContext';
import { Wifi } from 'lucide-react';

const Status: React.FC = () => {
    const systemStatus = useStatusContext();
    const systemSettings = useSettingsContext();
    const [wifiSignal, setWifiSignal] = useState<number | null>(null);

    useEffect(() => {
        const fetchWifiSignal = () => {
            fetch('/api/wifi-signal')
            .then(res => res.json())
            .then(data => setWifiSignal(data.signalStrength))
            .catch(() => setWifiSignal(null));
        };

        fetchWifiSignal();
        const interval = setInterval(fetchWifiSignal, 15000);
        return () => clearInterval(interval);
    }, []);

    if (!systemStatus) {
        return "Loading..."
    }

    return (
        <>
            <img src={systemStatus?.weatherData?.current.conditionIcon} alt="Weather Icon" className="h-8 w-8" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ marginTop: '10px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{systemStatus?.weatherData?.current.temperature?.toFixed(1)}°{systemSettings.temperatureUnit}</span>
                    <span>{systemStatus?.weatherData?.current.relativeHumidity?.toFixed(0)}% RH</span>
                    <span>
                        
                    </span>
                </div>
                <div style={{ alignSelf: 'flex-end', textAlign: 'right' }}>{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                <div style={{ alignSelf: 'flex-end', textAlign: 'right' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Wifi size={16} /> {wifiSignal !== null && wifiSignal !== undefined ? `${wifiSignal} dBm` : '...'}
                </span>
                </div>
            </div>
        </>
    );
};

export default Status;