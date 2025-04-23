
import SystemStatusCard from '../components/SystemStatusCard';
import { useStatusContext } from '../hooks/StatusContext';
import WeatherCard from '../components/WeatherCard';
import { ScheduleCard } from '../components/ScheduleCard';
import { SensorReadingsCard } from '../components/SensorReadingsCard';

interface DashboardProps {
}


export function Dashboard({}: DashboardProps) {
  
  const systemStatus = useStatusContext();



  if (!systemStatus) {
    return "Loading..."
  }
  return (
    <div className="space-y-6">
      {/* Weather Card */}
      <WeatherCard />
     
      {/* Next Scheduled */}
      <ScheduleCard />
      
      {/* Sensor Readings */}
      <SensorReadingsCard />
      
      {/* System Status */}
      <SystemStatusCard />
    </div>
  );
}