import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, LayoutDashboard, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SalesAnalytics from '../components/manager/SalesAnalytics';
import IndividualReports from '../components/manager/IndividualReports';

type TabType = 'dashboard' | 'reports';

export default function ManagerDashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard & Analytics', icon: LayoutDashboard },
    { id: 'reports', label: 'Individual Reports', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-[#000000] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="/images/mitsubishi-logo.png" 
                alt="Mitsubishi Logo" 
                className="h-8"
              />
              <div>
                <h1 className="text-xl font-bold text-white">Daly City Mitsubishi</h1>
                <p className="text-sm text-gray-300">Manager Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">
                {user?.email?.split('@')[0]} ({user?.role})
              </span>
              <button
                onClick={handleSignOut}
                className="text-gray-300 hover:text-white transition-colors"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === id
                    ? 'border-[#E60012] text-[#E60012]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className={`
                  h-5 w-5 mr-2
                  ${activeTab === id
                    ? 'text-[#E60012]'
                    : 'text-gray-400 group-hover:text-gray-500'
                  }
                `} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'dashboard' && <SalesAnalytics />}
          {activeTab === 'reports' && <IndividualReports />}
        </div>
      </div>
    </div>
  );
}