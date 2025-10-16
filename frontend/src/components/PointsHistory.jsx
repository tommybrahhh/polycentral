import React from 'react';
// The import is correct now: default export
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

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const PointsHistory = () => {
  // We can now safely destructure all three values because we know useFetch provides them.
  const { data: history, loading, error } = useFetch('/api/user/points-history');

  // Explicitly handle the loading state for a better UX.
  if (loading) {
    return <div className="loading">Loading points history...</div>;
  }

  // Explicitly handle the error state.
  if (error) {
    return <div className="error">Failed to load points history: {error}</div>;
  }
  
  // Handle the case where there is no data.
  if (!history || history.length === 0) {
    return (
        <div className="admin-content">
            <div className="admin-component-header"><h2>Points History</h2></div>
            <div className="card"><p>No points history available yet.</p></div>
        </div>
    );
  }

  const chartData = {
    labels: history.map(entry => formatDate(entry.created_at)),
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
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Points Balance Over Time', color: 'var(--off-white)' },
    },
    scales: {
        x: { ticks: { color: 'var(--light-gray)' } },
        y: { ticks: { color: 'var(--light-gray)' } }
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-component-header">
        <h2>Points History</h2>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h3>Balance Chart</h3>
        <Line options={chartOptions} data={chartData} />
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
            {[...history].reverse().map((entry, index) => (
              <tr key={index}>
                <td>{formatDate(entry.created_at)}</td>
                <td>{entry.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                <td style={{ color: entry.change_amount > 0 ? 'var(--success-green)' : 'var(--danger-red)' }}>
                  {entry.change_amount > 0 ? '+' : ''}{entry.change_amount}
                </td>
                <td>{entry.new_balance}</td>
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