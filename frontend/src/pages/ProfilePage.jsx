import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TabNavigation from '../components/TabNavigation';
import ProfileHistory from '../components/ProfileHistory';
import AdminControlPanel from '../components/AdminControlPanel';
import useFetch from '../hooks/useFetch';
import './ProfilePage.css';

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
        <div className="account-tab">
          <button onClick={() => navigate('/claim-points')}>
            Claim Free Points
          </button>
          <button onClick={() => {/* Logout logic */}}>
            Logout
          </button>
        </div>
      )}
      
      {activeTab === 'activity' && (
        <div className="activity-tab">
          <h2>Your Event Participation History</h2>
          <ProfileHistory history={history || []} />
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