// src/components/OutcomeTrendChart.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

const OutcomeTrendChart = ({ eventId, options }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('last_24_hours'); // 'last_24_hours', 'last_7_days', 'all'

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/${eventId}/participations`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch participation data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const parsedOptions = useMemo(() => {
    if (typeof options === 'string') {
      try {
        return JSON.parse(options);
      } catch {
        return [];
      }
    }
    return options || [];
  }, [options]);

  const outcomeValues = useMemo(() => {
    return parsedOptions.map(option => option.value);
  }, [parsedOptions]);

  const getColorForOutcome = (outcome) => {
    const colorMap = {
      'Higher': '#10B981',
      'Lower': '#EF4444',
      '0-3% up': '#34D399',
      '3-5% up': '#059669',
      '5%+ up': '#047857',
      '0-3% down': '#F87171',
      '3-5% down': '#DC2626',
      '5%+ down': '#B91C1C',
    };
    return colorMap[outcome] || '#A78BFA';
  };

  const chartData = useMemo(() => {
    if (data.length === 0) return { labels: [], datasets: [] };

    const sortedData = [...data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const now = new Date();
    let startDate;

    switch (timeframe) {
      case 'last_24_hours':
        startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
        break;
      case 'last_7_days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'all':
        startDate = sortedData.length > 0 ? new Date(sortedData[0].created_at) : now;
        break;
      default: // Fallback to last_24_hours if an invalid timeframe is somehow set
        startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        break;
    }

    const filteredData = sortedData.filter(entry => new Date(entry.created_at) >= startDate);

    const labels = filteredData.map(entry => new Date(entry.created_at));
    const datasets = outcomeValues.map(outcome => ({
      label: outcome,
      data: filteredData.map(entry => {
        if (entry.prediction === outcome) {
            const cumulativeCount = filteredData.filter(e => new Date(e.created_at) <= new Date(entry.created_at) && e.prediction === outcome).length;
            return cumulativeCount;
        }
        return null;
      }).filter(d => d !== null),
      borderColor: getColorForOutcome(outcome),
      backgroundColor: getColorForOutcome(outcome) + '40',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5
    }));

    return {
      labels,
      datasets
    };
  }, [data, timeframe, outcomeValues]);

  const currentDistribution = useMemo(() => {
    const total = data.length;
    if (total === 0) return {};
    
    const distribution = {};
    outcomeValues.forEach(outcome => {
      const count = data.filter(entry => entry.prediction === outcome).length;
      distribution[outcome] = (count / total) * 100;
    });
    
    return distribution;
  }, [data, outcomeValues]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        titleColor: '#F9FAFB',
        bodyColor: '#D1D5DB',
        borderColor: 'rgba(55, 65, 81, 1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'MMM dd, yyyy',
          displayFormats: {
            day: 'MMM d'
          }
        },
        grid: {
          color: 'rgba(55, 65, 81, 1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9CA3AF',
          maxRotation: 0,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
        }
      },
      y: {
        grid: {
          color: 'rgba(55, 65, 81, 1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9CA3AF',
          beginAtZero: true,
        }
      }
    }
  };

  if (loading) return <div className="h-64 bg-surface rounded-md animate-pulse"></div>;

  return (
    <div className="bg-surface p-4 rounded-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h3 className="text-lg font-semibold mb-4 sm:mb-0">Outcome Trend Analysis</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTimeframe('last_24_hours')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      timeframe === 'last_24_hours'
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Last 24 Hours
                  </button>
                  <button
                    onClick={() => setTimeframe('last_7_days')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      timeframe === 'last_7_days'
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => setTimeframe('all')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      timeframe === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    All Time
                  </button>
                </div>
              </div>
      <div className="mb-4 p-3 bg-charcoal rounded">
        <h4 className="text-sm font-medium mb-2">Current Distribution</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(currentDistribution).map(([outcome, percentage]) => (
            <div key={outcome} className="text-center">
              <div 
                className="text-xs font-semibold mb-1"
                style={{ color: getColorForOutcome(outcome) }}
              >
                {outcome}
              </div>
              <div className="text-lg font-bold">
                {percentage.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative h-64 sm:h-80 w-full">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="flex flex-wrap justify-center mt-4 gap-3">
        {chartData.datasets.map(dataset => (
          <div key={dataset.label} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: dataset.borderColor }}
            />
            <span className="text-sm text-secondary">{dataset.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

OutcomeTrendChart.propTypes = {
  eventId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  options: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
};

export default OutcomeTrendChart;