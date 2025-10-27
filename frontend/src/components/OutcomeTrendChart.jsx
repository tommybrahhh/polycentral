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
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const OutcomeTrendChart = ({ eventId, options }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('hour'); // 'hour', 'day', 'all'

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

  // Parse options to get all possible outcomes
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

  // Get all unique outcome values from options
  const outcomeValues = useMemo(() => {
    return parsedOptions.map(option => option.value);
  }, [parsedOptions]);

  // Helper function to get color based on outcome
  const getColorForOutcome = (outcome) => {
    // New color palette with better contrast for dark mode
    const colorMap = {
      'Higher': '#10B981',      // Emerald 500
      'Lower': '#EF4444',       // Red 500
      '0-3% up': '#34D399',     // Emerald 400
      '3-5% up': '#059669',     // Emerald 600
      '5%+ up': '#047857',      // Emerald 700
      '0-3% down': '#F87171',   // Red 400
      '3-5% down': '#DC2626',   // Red 600
      '5%+ down': '#B91C1C',    // Red 700
    };
    return colorMap[outcome] || '#A78BFA'; // A default vibrant color (Violet 400)
  };

  // Process data for the chart
  const chartData = useMemo(() => {
    if (data.length === 0) return { labels: [], datasets: [] };

    // Sort data by created_at to ensure chronological order
    const sortedData = [...data].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );

    const now = new Date();
    let timeIntervals = [];
    
    // Create time intervals based on selected timeframe
    if (timeframe === 'hour') {
      // Last 24 hours in 1-hour intervals
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        timeIntervals.push({
          time: time,
          label: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          counts: Object.fromEntries(outcomeValues.map(outcome => [outcome, 0]))
        });
      }
    } else if (timeframe === 'day') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        timeIntervals.push({
          time: date,
          label: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          counts: Object.fromEntries(outcomeValues.map(outcome => [outcome, 0]))
        });
      }
    } else {
      // All time - use fixed interval approach
      const firstParticipation = new Date(sortedData[0]?.created_at || now);
      const lastParticipation = new Date(sortedData[sortedData.length - 1]?.created_at || now);
      const timeDiff = lastParticipation - firstParticipation;
      
      // Determine optimal interval count (max 24 points)
      const maxPoints = 24;
      const intervalCount = Math.min(maxPoints, Math.ceil(timeDiff / (60 * 60 * 1000))); // max 24 hours worth of points
      
      for (let i = 0; i < intervalCount; i++) {
        const intervalTime = new Date(firstParticipation.getTime() + (i * timeDiff / intervalCount));
        timeIntervals.push({
          time: intervalTime,
          label: intervalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          counts: Object.fromEntries(outcomeValues.map(outcome => [outcome, 0]))
        });
      }
    }

    // Count participations in each time interval
    sortedData.forEach(entry => {
      const entryTime = new Date(entry.created_at);
      
      for (let i = 0; i < timeIntervals.length - 1; i++) {
        const currentInterval = timeIntervals[i];
        const nextInterval = timeIntervals[i + 1];
        
        if (entryTime >= currentInterval.time && entryTime < nextInterval.time) {
          if (currentInterval.counts[entry.prediction] !== undefined) {
            currentInterval.counts[entry.prediction]++;
          }
          break;
        }
      }
    });

    // Calculate cumulative counts
    const cumulativeCounts = Object.fromEntries(outcomeValues.map(outcome => [outcome, 0]));
    const seriesData = timeIntervals.map(interval => {
      outcomeValues.forEach(outcome => {
        cumulativeCounts[outcome] += interval.counts[outcome];
      });
      
      return {
        time: interval.label,
        ...Object.fromEntries(outcomeValues.map(outcome => [outcome, cumulativeCounts[outcome]]))
      };
    });

    // Prepare datasets for ChartJS
    const datasets = outcomeValues.map(outcome => ({
      label: outcome,
      data: seriesData.map(item => item[outcome]),
      borderColor: getColorForOutcome(outcome),
      backgroundColor: getColorForOutcome(outcome) + '40', // Add opacity
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5
    }));

    return {
      labels: seriesData.map(item => item.time),
      datasets: datasets
    };
  }, [data, timeframe, outcomeValues]);

  // Calculate current distribution percentages
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

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Keep custom legend
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.8)', // Darker tooltip (gray-900)
        titleColor: '#F9FAFB', // Lighter title (gray-50)
        bodyColor: '#D1D5DB',  // Lighter body (gray-300)
        borderColor: 'rgba(55, 65, 81, 1)', // gray-700
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(55, 65, 81, 1)', // gray-700 for a subtle grid
          drawBorder: false,
        },
        ticks: {
          color: '#9CA3AF', // gray-400 for axis labels
          maxRotation: 0, // Keep labels horizontal
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
        }
      },
      y: {
        grid: {
          color: 'rgba(55, 65, 81, 1)', // gray-700
          drawBorder: false,
        },
        ticks: {
          color: '#9CA3AF', // gray-400
          beginAtZero: true,
        }
      }
    }
  };

  if (loading) return <div className="h-64 bg-surface rounded-md animate-pulse"></div>;

  return (
    <div className="bg-surface p-4 rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Outcome Trend Analysis</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeframe('hour')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              timeframe === 'hour'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Last 24h
          </button>
          <button
            onClick={() => setTimeframe('day')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              timeframe === 'day'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Last 7d
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              timeframe === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Current Distribution Summary */}
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

      {/* Chart Container */}
      <div className="relative h-64 w-full">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Legend */}
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