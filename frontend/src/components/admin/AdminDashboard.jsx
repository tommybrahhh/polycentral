import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PlatformFeesManagement from './PlatformFeesManagement';
import UserManagement from './UserManagement';
import EventManagement from './EventManagement';
import useFetch from '../../hooks/useFetch';
import '../../styles/admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'fees');
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

  // Update URL when tab changes
  useEffect(() => {
    navigate(`?tab=${activeTab}`, { replace: true });
  }, [activeTab, navigate]);

  if (loading) return <div className="loading">Loading admin dashboard...</div>;
  if (error) return <div className="error">Error loading admin dashboard: {error}</div>;
  if (!userProfile?.is_admin) return <div className="error">Access denied. Admin privileges required.</div>;

  const tabs = [
    { id: 'fees', label: 'Platform Fees', component: PlatformFeesManagement },
    { id: 'users', label: 'User Management', component: UserManagement },
    { id: 'events', label: 'Event Management', component: EventManagement }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || PlatformFeesManagement;

  // Function to handle repair
  const handleRepairDatabase = async () => {
    if (!window.confirm("This will force the database to update. Use only if you see 500 errors. Continue?")) return;
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/fix-database`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        alert(`Success! Migrations run: ${data.migrationsRun.length > 0 ? data.migrationsRun.join(', ') : 'None (Already up to date)'}`);
        window.location.reload(); // Reload to fix the 500 error page
      } else {
        alert(`Error: ${data.error} - ${data.message}`);
      }
    } catch (err) {
      alert('Network Error: Could not reach server.');
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage platform users, events, and fees</p>
        <button
          onClick={handleRepairDatabase}
          style={{ backgroundColor: '#dc2626', color: 'white', padding: '10px', margin: '10px', borderRadius: '5px' }}
        >
          🔧 Fix Database Error (500)
        </button>
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