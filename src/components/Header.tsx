import { Droplets, Cloud } from 'lucide-react';
import React from 'react';
import Status from './StatusBar';

const Header: React.FC = () => {
    return (
        <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Droplets className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">Smart Irrigation System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Status />
              </div>
            </div>
          </div>
        </div>
      </header>
    );
};

export default Header;