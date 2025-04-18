import React, {  } from 'react';
import { AlertTriangle, Droplets, Sun } from 'lucide-react';
import { useStatusContext } from '../hooks/StatusContext';
import { DateTimeUtils } from '../server/utilities/DateTimeUtils';
import { useSettingsContext } from '../hooks/SettingsContext';

export interface SystemStatusCardProps {
}

const SystemStatusCard: React.FC<SystemStatusCardProps> = ({}) => {
  const systemStatus = useStatusContext()
  const systemSettings = useSettingsContext()
  if (!systemStatus || !systemSettings) {
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

        {/* Add spacing between sections */}
        <div className="h-4"></div>

        {/* Active Zones */}
        <div className="space-x-3 p-3 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Active Zones</h2>
          {systemStatus?.activeZone ? (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
          <Droplets className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-green-900">{systemStatus.activeZone.name}</p>
            <p className="text-sm text-green-600">
              Started at: {DateTimeUtils.isoToTimeShortMed(systemStatus.activeZoneStart, systemSettings.timezone)} - Ends at: {DateTimeUtils.isoToTimeShortMed(systemStatus.activeZoneEnd, systemSettings.timezone)}
            </p>
          </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-left py-4">No zones running</p>
          )}
        </div>
      </div>
    </>
  );
};

export default SystemStatusCard;