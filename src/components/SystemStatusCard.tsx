import React, {  } from 'react';
import { AlertTriangle, Cloud, Sun } from 'lucide-react';
import { useStatusContext } from './StatusContext';
import { DateTimeUtils } from '../server/utilities/DateTimeUtils';
import { useSettingsContext } from './SettingsContext';
import WeatherCard from './WeatherCard';

export interface SystemStatusCardProps {
}

const SystemStatusCard: React.FC<SystemStatusCardProps> = ({}) => {
  const systemStatus = useStatusContext()
  const systemSettings = useSettingsContext();
  if (!systemStatus) {
    return "Loading..."
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          {systemStatus?.lastSchedulerRun && (new Date().getTime() - new Date(systemStatus.lastSchedulerRun).getTime() <= 60000) ? (
            <Sun className="h-6 w-6 text-green-600" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-red-600" />
          )}
          <div>
            <p className="font-medium text-gray-900">
              System is {systemStatus?.lastSchedulerRun && (new Date().getTime() - new Date(systemStatus.lastSchedulerRun).getTime() <= 60000) ? 'Running' : 'Not Running'}
            </p>
            <p className="text-sm text-green-600">
                  Last run at: {systemStatus.lastSchedulerRun?.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <WeatherCard />
      </div>
    </>
  );
};

export default SystemStatusCard;