import React from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch'; 
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import '../styles/admin.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const formatFullDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const formatDateForChart = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: '2-digit', month: '2-digit', day: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-GB', options);
};

const PointsHistory = () => {
  const { data: history, loading, error } = useFetch('/api/user/points-history');

  if (loading) {
    return <div className="loading">Loading points history...</div>;
  }

  if (error) {
    return <div className="error">Failed to load points history: {error}</div>;
  }
  
  if (!history || history.length === 0) {
    return (
      <div className="admin-content">
        <div className="admin-component-header"><h2>Points History</h2></div>
        <div className="card"><p>No points history available yet.</p></div>
      </div>
    );
  }

  const chartData = {
    labels: history.map(entry => formatDateForChart(entry.created_at)),
    datasets: [
      {
        label: 'Points Balance',
        data: history.map(entry => entry.new_balance),
        borderColor: 'var(--orange-primary)',
        backgroundColor: 'rgba(255, 140, 0, 0.2)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Points Balance Over Time',
        color: 'var(--orange-primary)',
        font: { 
          size: 20,
          family: 'inherit'
        },
        padding: {
          bottom: 20
        }
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--light-gray)',
          font: { family: 'inherit' }
        },
        grid: {
          color: 'rgba(230, 113, 4, 0.1)'
        }
      },
      y: {
        ticks: {
          color: 'var(--light-gray)',
          font: { family: 'inherit' }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-component-header">
        <h2>Points History</h2>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        <h3>Balance Chart</h3>
        <div style={{ flexGrow: 1, position: 'relative' }}>
          <Line options={chartOptions} data={chartData} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        {[...history].reverse().map((entry) => (
          <div key={entry.id || entry.created_at} className="card p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-light-gray text-sm">{formatFullDate(entry.created_at)}</span>
              <span
                className={`font-semibold ${entry.change_amount > 0 ? 'text-success-green' : 'text-danger-red'}`}
              >
                {entry.change_amount > 0 ? '+' : ''}{entry.change_amount}
              </span>
            </div>
            
            <div className="mb-2">
              <span className="text-off-white">
                {entry.event_id ? (
                  <Link to={`/events/${entry.event_id}`} className="text-off-white hover:text-orange-primary">
                    {entry.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Link>
                ) : (
                  entry.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                )}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-light-gray text-sm">New Balance:</span>
              <span className="text-orange-primary font-semibold">
                {entry.new_balance.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PointsHistory;