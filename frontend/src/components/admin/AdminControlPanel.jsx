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
    <div className="admin-control-panel p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">Admin Control Panel</h3>
        <div className="flex gap-2">
          {metrics?.pendingEvents > 0 && (
            <button
              onClick={handleResolveEvents}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Resolve Events ({metrics.pendingEvents})
            </button>
          )}
          <button
            onClick={handleCreateEvent}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Create Event
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Full Admin Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          Error loading metrics: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="animate-pulse p-4 bg-white rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))
        ) : metrics ? (
          <>
            <div className="p-4 bg-white rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Total Events</h4>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(metrics.totalEvents)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Active Events</h4>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(metrics.activeEvents)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Completed Events</h4>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(metrics.completedEvents)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Total Fees</h4>
              <p className="text-2xl font-semibold text-green-600">
                {formatCurrency(metrics.totalFees)}
              </p>
            </div>
          </>
        ) : null}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleCreateEvent}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors text-center"
          >
            📝 Create New Event
          </button>
          <button
            onClick={handleResolveEvents}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors text-center"
          >
            ⚡ Resolve Pending Events
          </button>
          <button
            onClick={() => navigate('/admin?tab=users')}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors text-center"
          >
            👥 Manage Users
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminControlPanel;