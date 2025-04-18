import React from 'react';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { remult } from 'remult';
import { SystemLog } from '../shared/systemLog';


interface SystemLogsProps {
}

export function SystemLogs({ }: SystemLogsProps) {
  const [filter, setFilter] = React.useState<'ALL' | 'INFO' | 'WARNING' | 'ERROR'>('ALL');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const logsRepo = remult.repo(SystemLog);

  useEffect(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    logsRepo
      .liveQuery({
      where: {
        timestamp: { $gte: oneWeekAgo },
      },
      })
      .subscribe(info => setSystemLogs(info.applyChanges));
  }, []);

  const filteredLogs = React.useMemo(() => {
    return systemLogs
      .filter(log => filter === 'ALL' || log.level === filter)
      .filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [systemLogs, filter, searchTerm]);

  const getLogIcon = (type: 'INFO' | 'WARNING' | 'ERROR') => {
    switch (type) {
      case 'INFO':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'ERROR':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getLogClass = (type: 'INFO' | 'WARNING' | 'ERROR', highlight: boolean) => {
    switch (type) {
      case 'INFO':
      return highlight ? 'bg-blue-100' : 'bg-blue-50';
      case 'WARNING':
      return highlight ? 'bg-yellow-100' : 'bg-yellow-50';
      case 'ERROR':
      return highlight ? 'bg-red-100' : 'bg-red-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              filter === 'ALL'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('INFO')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              filter === 'INFO'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Info
          </button>
          <button
            onClick={() => setFilter('WARNING')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              filter === 'WARNING'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Warning
          </button>
          <button
            onClick={() => setFilter('ERROR')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              filter === 'ERROR'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Error
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, index) => (
                <div
                key={index}
                className={`p-4 ${getLogClass(log.level, log.highlight)} flex items-start space-x-3`}
                >
                {getLogIcon(log.level)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                  {log.message}
                  </p>
                  <p className="text-xs text-gray-500">
                  {log.timestamp.toLocaleString()}
                  </p>
                </div>
                </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No logs found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}