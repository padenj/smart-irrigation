import React, { useEffect, useState } from 'react';
import { remult } from 'remult';
import { SystemStatus } from '../shared/systemStatus';
import { Cloud } from 'lucide-react';

const controllerRepo = remult.repo(SystemStatus);

const Status: React.FC = () => {
    const [systemStatus, setSystemStatus] = useState<SystemStatus>();

    useEffect(() => {
        controllerRepo.liveQuery({ where: { id: 0 } }).subscribe(info => {
            const changes = info.applyChanges([]);
            setSystemStatus(changes[0]);
        });
    }, [])

    if (!systemStatus) {
        return "Loading..."
    }

    return (
        <>
            <Cloud className="h-5 w-5" />
            <span>{systemStatus?.weatherData?.current.temperature?.toFixed(1)}°C</span>
            <span>{systemStatus?.weatherData?.current.relativeHumidity?.toFixed(0)}% RH</span>
        </>
    );
};

export default Status;