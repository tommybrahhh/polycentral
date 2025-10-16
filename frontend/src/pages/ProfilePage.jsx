import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TabNavigation from '../components/TabNavigation';
import ProfileHistory from '../components/ProfileHistory';
import PointsHistory from '../components/PointsHistory';
import AdminControlPanel from '../components/admin/AdminControlPanel';
import useFetch from '../hooks/useFetch';
import '../styles/admin.css';

const ProfilePage = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'account');
  const { data: history } = useFetch('/api/user/history');
  const { data: userData } = useFetch('/api/user/profile', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  });
  const navigate = useNavigate();

  const tabs = [
    { id: 'account', label: 'Account Settings' },
    { id: 'activity', label: 'Activity History' },
    ...(userData?.is_admin ? [{ id: 'controlpanel', label: 'Control Panel' }] : []),
  ];

  return (
    <div className="profile-page">
      <TabNavigation 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          navigate(`?tab=${tab}`);
          setActiveTab(tab);
        }}
      />
      
      {activeTab === 'account' && (
        <div className="admin-content">
          <div className="admin-component-header">
            <h2>Account Settings</h2>
          </div>
          
          <div className="card">
            <h3>Account Management</h3>
            <div className="button-group" style={{ marginTop: 'var(--spacing-lg)' }}>
              <button
                className="button button-danger"
                onClick={() => {
                  // Clear authentication data
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('user');
                  // Redirect to home page
                  navigate('/');
                  window.location.reload();
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'activity' && (
        <div>
          <ProfileHistory history={history || []} />
          <PointsHistory />
        </div>
      )}
      {activeTab === 'controlpanel' && (
        <div className="controlpanel-tab">
          <AdminControlPanel />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;