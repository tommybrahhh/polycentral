import React from 'react';
import { getAllUsers, getAllEvents, getPlatformFeesTotal, resolveEvent } from '../../services/adminApi';
import useFetch from '../../hooks/useFetch';

const AdminControlPanel = () => {
  const { data: users } = useFetch(() => getAllUsers());
  const { data: events, refetch: refetchEvents } = useFetch(() => getAllEvents());
  const { data: platformFees } = useFetch(() => getPlatformFeesTotal());

  return (
    <div className="admin-control-panel">
      <h3>Quick Admin Overview</h3>
      
      <div className="stats-section">
        <div className="stat-item">
          <h4>Total Users</h4>
          <p>{users?.length || 0}</p>
        </div>
        <div className="stat-item">
          <h4>Active Events</h4>
          <p>{events?.filter(e => e.status === 'active').length || 0}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminControlPanel;