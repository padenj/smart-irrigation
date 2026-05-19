import React, { createContext, useState, useEffect, useContext } from 'react';
import { remult } from 'remult';
import type { SystemSettings } from '../shared/systemSettings';
import { SystemSettingsDto } from '../server/dto/SystemSettingsDto';


const SettingsContext = createContext<SystemSettings>(new SystemSettingsDto());

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SystemSettings>(new SystemSettingsDto());

    const fetchSettings = async () => {
        try {
            const systemSettingsRepo = remult.repo(SystemSettingsDto);
            const systemSettings = await systemSettingsRepo.findFirst(); 
            if (!systemSettings) {
                console.error('No system settings found');
                return;
            }
            setSettings(systemSettings);
        } catch (error) {
            console.error('Failed to fetch system settings:', error);
        }
    };

    useEffect(() => {
        fetchSettings();
        const interval = setInterval(fetchSettings, 3000); // Update every 10 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <SettingsContext.Provider value={settings}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettingsContext = (): SystemSettings => {
    const context = useContext(SettingsContext);
    // if (!context) {
    //     throw new Error('useSettings must be used within a SettingsProvider');
    // }
    return context;
};
