import React, { useState, useEffect } from 'react';
import { getAllUsers, getAllEvents, getPlatformFeesTotal, resolveEvent } from '../../services/adminApi';
import useFetch from '../../hooks/useFetch';
import adminApi from '../../services/adminApi';
import { useNavigate } from 'react-router-dom';

const AdminControlPanel = () => {
  const navigate = useNavigate();
  const { data: users } = useFetch(() => getAllUsers());
  const { data: events, refetch: refetchEvents } = useFetch(() => getAllEvents());
  const { data: platformFees } = useFetch(() => getPlatformFeesTotal());

  // Metrics state
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await adminApi.get('/api/admin/metrics');
        setMetrics(response.data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const formatNumber = (num) =>
    new Intl.NumberFormat().format(num || 0);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);

  const handleResolveEvents = () => {
    // Navigate to admin dashboard with events tab active
    navigate('/admin?tab=events');
  };

  const handleCreateEvent = () => {
    // Navigate to admin dashboard with events tab active
    navigate('/admin?tab=events');
    // Trigger event creation modal after a short delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: 'events' }));
      setTimeout(() => {
        const createButton = document.querySelector('.button.button-primary');
        if (createButton && createButton.textContent.includes('Create Event')) {
          createButton.click();
        }
      }, 500);
    }, 100);
  };

  return (
    <div className="p-lg space-y-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-primary">Admin Control Panel</h3>
        <div className="flex gap-sm">
          {metrics?.pendingEvents > 0 && (
           <button
             onClick={handleResolveEvents}
             className="btn btn-primary"
           >
             Resolve Events ({metrics.pendingEvents})
           </button>
         )}
         <button
           onClick={handleCreateEvent}
           className="btn btn-primary"
         >
           Create Event
         </button>
         <button
           onClick={() => navigate('/admin')}
           className="btn btn-secondary"
         >
           Full Admin Dashboard
         </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          Error loading metrics: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="animate-pulse p-md bg-surface rounded-md">
              <div className="h-sm bg-charcoal rounded w-1/3 mb-md"></div>
              <div className="h-md bg-charcoal rounded w-2/3"></div>
            </div>
          ))
        ) : metrics ? (
          <>
            <div className="card text-center">
              <h4 className="text-secondary mb-sm">Total Events</h4>
              <p className="text-primary font-bold text-xl">
                {formatNumber(metrics.totalEvents)}
              </p>
            </div>
            <div className="card text-center">
              <h4 className="text-secondary mb-sm">Active Events</h4>
              <p className="text-primary font-bold text-xl">
                {formatNumber(metrics.activeEvents)}
              </p>
            </div>
            <div className="card text-center">
              <h4 className="text-secondary mb-sm">Completed Events</h4>
              <p className="text-primary font-bold text-xl">
                {formatNumber(metrics.completedEvents)}
              </p>
            </div>
            <div className="card text-center">
              <h4 className="text-secondary mb-sm">Total Fees</h4>
              <p className="text-success font-bold text-xl">
                {formatCurrency(metrics.totalFees)}
              </p>
            </div>
          </>
        ) : null}
      </div>

      <div className="card p-lg">
        <h4 className="text-center mb-md">Quick Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <button
            onClick={handleCreateEvent}
            className="btn btn-primary btn-lg"
          >
            📝 Create New Event
          </button>
          <button
            onClick={handleResolveEvents}
            className="btn btn-primary btn-lg"
          >
            ⚡ Resolve Pending Events
          </button>
          <button
            onClick={() => navigate('/admin?tab=users')}
            className="btn btn-primary btn-lg"
          >
            👥 Manage Users
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminControlPanel;