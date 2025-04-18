import { Droplets, Clock, Cloud, CloudRain, ThermometerSun } from 'lucide-react';

import SystemStatusCard from '../components/SystemStatusCard';
import { useStatusContext } from '../hooks/StatusContext';
import { Program } from '../shared/programs';
import { remult } from 'remult';
import { DateTimeUtils } from '../server/utilities/DateTimeUtils';
import { useSettingsContext } from '../hooks/SettingsContext';
import React from 'react';
import WeatherCard from '../components/WeatherCard';
import { ScheduleCard } from '../components/ScheduleCard';

interface DashboardProps {
}


export function Dashboard({}: DashboardProps) {
  
  const systemStatus = useStatusContext();
  const systemSettings = useSettingsContext();



  if (!systemStatus) {
    return "Loading..."
  }
  return (
    <div className="space-y-6">
      {/* Weather Card */}
      <WeatherCard />
     
      {/* Next Scheduled */}
      <ScheduleCard />
      
      {/* System Status */}
      <SystemStatusCard />
    </div>
  );
}