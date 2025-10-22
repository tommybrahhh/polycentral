// src/components/OutcomeTrendChart.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const OutcomeTrendChart = ({ eventId, options }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all'); // 'hour', 'day', 'all'

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

  // Process data for the chart
  const chartData = useMemo(() => {
    if (data.length === 0) return { series: [], timeLabels: [] };

    // Group data by time intervals
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
      // All time - group by hour for the first day, then by day
      const firstParticipation = new Date(data[0]?.created_at || now);
      const timeDiff = now - firstParticipation;
      const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
      
      if (daysDiff <= 1) {
        // Less than 1 day, group by hour
        for (let i = 0; i <= 24; i++) {
          const time = new Date(firstParticipation.getTime() + i * 60 * 60 * 1000);
          if (time > now) break;
          timeIntervals.push({
            time: time,
            label: time.toLocaleTimeString([], { hour: '2-digit' }),
            counts: Object.fromEntries(outcomeValues.map(outcome => [outcome, 0]))
          });
        }
      } else {
        // More than 1 day, group by day
        for (let i = 0; i <= daysDiff; i++) {
          const date = new Date(firstParticipation.getTime() + i * 24 * 60 * 60 * 1000);
          if (date > now) break;
          timeIntervals.push({
            time: date,
            label: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            counts: Object.fromEntries(outcomeValues.map(outcome => [outcome, 0]))
          });
        }
      }
    }

    // Count participations in each time interval
    data.forEach(entry => {
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

    return {
      series: outcomeValues.map(outcome => ({
        name: outcome,
        data: seriesData.map(item => item[outcome]),
        color: getColorForOutcome(outcome)
      })),
      timeLabels: seriesData.map(item => item.time)
    };
  }, [data, timeframe, outcomeValues]);

  // Helper function to get color based on outcome
  const getColorForOutcome = (outcome) => {
    const colorMap = {
      'Higher': 'var(--success)',
      'Lower': 'var(--danger)',
      '0-3% up': 'var(--success-light)',
      '3-5% up': 'var(--success)',
      '5%+ up': 'var(--success-dark)',
      '0-3% down': 'var(--danger-light)',
      '3-5% down': 'var(--danger)',
      '5%+ down': 'var(--danger-dark)'
    };
    return colorMap[outcome] || '#8884d8';
  };

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

  if (loading) return <div className="h-64 bg-surface rounded-md animate-pulse"></div>;

  return (
    <div className="bg-surface p-4 rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Outcome Trend Analysis</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeframe('hour')}
            className={`px-3 py-1 rounded text-sm ${
              timeframe === 'hour' 
                ? 'bg-primary text-white' 
                : 'bg-charcoal text-secondary hover:bg-gray-600'
            }`}
          >
            Last 24h
          </button>
          <button
            onClick={() => setTimeframe('day')}
            className={`px-3 py-1 rounded text-sm ${
              timeframe === 'day' 
                ? 'bg-primary text-white' 
                : 'bg-charcoal text-secondary hover:bg-gray-600'
            }`}
          >
            Last 7d
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1 rounded text-sm ${
              timeframe === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-charcoal text-secondary hover:bg-gray-600'
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
      <div className="relative h-48 w-full">
        <svg viewBox={`0 0 ${chartData.timeLabels.length * 40} 200`} preserveAspectRatio="none" className="w-full h-full">
          <defs>
            {chartData.series.map(series => (
              <linearGradient key={series.name} id={`gradient-${series.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series.color} stopOpacity="0.4"/>
                <stop offset="100%" stopColor={series.color} stopOpacity="0"/>
              </linearGradient>
            ))}
          </defs>

          {/* Fill areas */}
          {chartData.series.map(series => (
            <path
              key={series.name}
              d={getAreaPath(series.data, chartData.timeLabels.length)}
              fill={`url(#gradient-${series.name})`}
            />
          ))}

          {/* Lines */}
          {chartData.series.map(series => (
            <path
              key={series.name}
              d={getLinePath(series.data, chartData.timeLabels.length)}
              fill="none"
              stroke={series.color}
              strokeWidth="2"
              className="draw-line"
            />
          ))}

          {/* Data points */}
          {chartData.series.map(series => (
            series.data.map((value, index) => (
              <circle
                key={`${series.name}-${index}`}
                cx={index * 40 + 20}
                cy={200 - (value / Math.max(...chartData.series.flatMap(s => s.data)) * 180) - 10}
                r="3"
                fill={series.color}
                className="opacity-0 hover:opacity-100 transition-opacity"
              />
            ))
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center mt-4 gap-3">
        {chartData.series.map(series => (
          <div key={series.name} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: series.color }}
            />
            <span className="text-sm text-secondary">{series.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to create SVG path for line
const getLinePath = (data, totalPoints) => {
  if (data.length === 0) return '';
  
  const maxValue = Math.max(...data);
  const points = data.map((value, index) => {
    const x = (index / (totalPoints - 1)) * (totalPoints * 40 - 40) + 20;
    const y = 200 - (value / maxValue * 180) - 10;
    return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
  });
  
  return points.join(' ');
};

// Helper function to create SVG path for area
const getAreaPath = (data, totalPoints) => {
  if (data.length === 0) return '';
  
  const maxValue = Math.max(...data);
  const points = data.map((value, index) => {
    const x = (index / (totalPoints - 1)) * (totalPoints * 40 - 40) + 20;
    const y = 200 - (value / maxValue * 180) - 10;
    return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
  });
  
  // Close the path
  return points.join(' ') + ` L ${(totalPoints - 1) * 40 + 20},200 L 20,200 Z`;
};

OutcomeTrendChart.propTypes = {
  eventId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  options: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
};

export default OutcomeTrendChart;