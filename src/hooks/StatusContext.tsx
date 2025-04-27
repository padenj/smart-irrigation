import React, { createContext, useState, useEffect, useContext } from 'react';
import { remult } from 'remult';
import { SystemStatus } from '../shared/systemStatus';


const StatusContext = createContext<SystemStatus>(new SystemStatus());

export const StatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<SystemStatus>(new SystemStatus());

    const fetchStatus = async () => {
        try {
            const systemStatusRepo = remult.repo(SystemStatus);
            const systemStatus = await systemStatusRepo.findFirst(); 
            if (!systemStatus) {
                console.error('No system status found');
                return;
            }
            setStatus(systemStatus);
        } catch (error) {
            console.error('Failed to fetch system status:', error);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000); 
        return () => clearInterval(interval);
    }, []);

    return (
        <StatusContext.Provider value={status}>
            {children}
        </StatusContext.Provider>
    );
};

export const useStatusContext = (): SystemStatus => {
    const context = useContext(StatusContext);
    // if (!context) {
    //     throw new Error('useStatus must be used within a StatusProvider');
    // }
    return context;
};