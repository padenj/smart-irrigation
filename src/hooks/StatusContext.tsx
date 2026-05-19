import React, { createContext, useState, useEffect, useContext } from 'react';
import { remult } from 'remult';
import type { SystemStatus } from '../shared/systemStatus';
import { SystemStatusDto } from '../server/dto/SystemStatusDto';


const StatusContext = createContext<SystemStatus>(new SystemStatusDto());

export const StatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<SystemStatus>(new SystemStatusDto());

    useEffect(() => {
        const systemStatusRepo = remult.repo(SystemStatusDto);
        const loadStatus = async () => {
            try {
                const systemStatus = await systemStatusRepo.findId(0);
                if (!systemStatus) {
                    return;
                }

                setStatus(systemStatus);
            } catch (error) {
                console.error('Failed to fetch system status:', error);
            }
        };

        void loadStatus();

        const subscription = systemStatusRepo
            .liveQuery({ where: { id: 0 } })
            .subscribe(() => {
                void loadStatus();
            });

        return subscription;
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
