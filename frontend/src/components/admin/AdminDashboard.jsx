import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PlatformFeesManagement from './PlatformFeesManagement';
import UserManagement from './UserManagement';
import EventManagement from './EventManagement';
import useFetch from '../../hooks/useFetch';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('fees');
  const navigate = useNavigate();
  
  // Check if user is admin
  const { data: userProfile, loading, error } = useFetch('/api/user/profile');
  
  useEffect(() => {
    if (!loading && !error && userProfile && !userProfile.is_admin) {
      navigate('/');
    }

    // Listen for tab change events from other components
    const handleTabChange = (event) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('admin-tab-change', handleTabChange);
    
    return () => {
      window.removeEventListener('admin-tab-change', handleTabChange);
    };
  }, [userProfile, loading, error, navigate]);

  if (loading) return <div className="loading">Loading admin dashboard...</div>;
  if (error) return <div className="error">Error loading admin dashboard: {error}</div>;
  if (!userProfile?.is_admin) return <div className="error">Access denied. Admin privileges required.</div>;

  const tabs = [
    { id: 'fees', label: 'Platform Fees', component: PlatformFeesManagement },
    { id: 'users', label: 'User Management', component: UserManagement },
    { id: 'events', label: 'Event Management', component: EventManagement }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || PlatformFeesManagement;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage platform users, events, and fees</p>
      </div>
      
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="admin-content">
        <ActiveComponent activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
};

export default AdminDashboard;