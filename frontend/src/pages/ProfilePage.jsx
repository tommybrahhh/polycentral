import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TabNavigation from '../components/TabNavigation';
import ProfileHistory from '../components/ProfileHistory';
import PointsHistory from '../components/PointsHistory'; // This import is correct
import ChangeEmailForm from '../components/ChangeEmailForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
import AdminControlPanel from '../components/admin/AdminControlPanel';
import useFetch from '../hooks/useFetch';
import '../styles/admin.css';

const ProfilePage = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'account');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
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
    { id: 'points', label: 'Points History' }, // <-- FIX #1: ADD THE NEW TAB HERE
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
          
          {/* Profile Information Card */}
          <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3>Profile Information</h3>
            {userData ? (
              <div className="account-info" style={{ marginTop: 'var(--spacing-md)', lineHeight: '1.8' }}>
                <div><strong>Email:</strong> {userData.email}</div>
                <div><strong>Username:</strong> {userData.username}</div>
                <div><strong>Points:</strong> {userData.points}</div>
              </div>
            ) : <p>Loading user data...</p>}
          </div>

          {/* Management Actions Card */}
          <div className="card">
            <h3>Account Management</h3>
            <div className="button-group" style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)' }}>
              <button className="button button-secondary" onClick={() => setShowEmailForm(true)}>
                Change Email
              </button>
              <button className="button button-secondary" onClick={() => setShowPasswordForm(true)}>
                Change Password
              </button>
            </div>
            <p style={{ marginTop: 'var(--spacing-lg)', color: 'var(--light-gray)', fontSize: '0.9rem' }}>
              You can log out using the menu in the main header.
            </p>
          </div>

          {/* --- MODALS --- */}
          {/* These will now only render when their state is true, appearing as pop-ups */}
          
          {showEmailForm && (
            <ChangeEmailForm
              onClose={() => setShowEmailForm(false)}
              onSuccess={() => {
                setShowEmailForm(false);
                // Refresh user data to show updated email if needed
                window.location.reload();
              }}
            />
          )}

          {showPasswordForm && (
            <ChangePasswordForm
              onClose={() => setShowPasswordForm(false)}
              onSuccess={() => setShowPasswordForm(false)}
            />
          )}
        </div>
      )}
      
      {activeTab === 'activity' && (
        // FIX #2: Remove PointsHistory from here
        <ProfileHistory history={history || []} />
      )}

      {/* FIX #3: ADD A DEDICATED BLOCK FOR THE POINTS HISTORY TAB */}
      {activeTab === 'points' && (
        <PointsHistory />
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