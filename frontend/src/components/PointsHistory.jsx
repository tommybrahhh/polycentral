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
          color: 'rgba(255, 255, 255, 0.1)'
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
      
      <div className="card">
        <h3>Transaction Log</h3>
        <table className="history-table" style={{ width: '100%', marginTop: 'var(--spacing-md)' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reason</th>
              <th>Change</th>
              <th>New Balance</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((entry) => (
              <tr key={entry.id || entry.created_at}>
                <td>{formatFullDate(entry.created_at)}</td>
                <td>
                  {entry.event_id ? (
                    <Link to={`/events/${entry.event_id}`} style={{ color: 'var(--off-white)' }}>
                      {entry.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Link>
                  ) : (
                    entry.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  )}
                </td>
                <td style={{ color: entry.change_amount > 0 ? 'var(--success-green)' : 'var(--danger-red)', fontWeight: '600' }}>
                  {entry.change_amount > 0 ? '+' : ''}{entry.change_amount}
                </td>
                <td style={{ color: 'var(--orange-primary)', fontWeight: '600' }}>
                  {entry.new_balance.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <style>{`
          .history-table th, .history-table td {
            padding: var(--spacing-sm) var(--spacing-md);
            text-align: left;
            border-bottom: 1px solid var(--ui-border);
          }
          .history-table th {
            color: var(--light-gray);
            font-weight: 500;
          }
        `}</style>
      </div>
    </div>
  );
};

export default PointsHistory;