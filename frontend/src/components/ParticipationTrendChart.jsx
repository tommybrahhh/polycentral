// src/components/ParticipationTrendChart.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const ParticipationTrendChart = ({ eventId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const chartData = useMemo(() => {
    if (data.length === 0) return { higherPath: 'M 0,50 L 100,50', lowerPath: 'M 0,50 L 100,50' };

    let higherCount = 0;
    let lowerCount = 0;
    const higherPoints = [{ x: 0, y: 0 }];
    const lowerPoints = [{ x: 0, y: 0 }];

    data.forEach(entry => {
      // Logic supports both legacy and new "Higher/Lower" options
      if (entry.prediction === 'Higher' || entry.prediction.includes('up')) {
        higherCount++;
      } else {
        lowerCount++;
      }
      higherPoints.push({ x: higherPoints.length, y: higherCount });
      lowerPoints.push({ x: lowerPoints.length, y: lowerCount });
    });

    const totalPoints = data.length;
    const maxCount = Math.max(higherCount, lowerCount, 1); // Avoid division by zero

    const toPath = (points) => {
      if (points.length <= 1) return 'M 0,50 L 100,50'; // Flat line if no data
      const path = points.map((p, i) => {
        const x = (i / totalPoints) * 100;
        const y = 50 - ((p.y / maxCount) * 45); // Scale to fit in viewbox, leaving margin
        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
      }).join(' ');
      return path;
    };
    
    return { higherPath: toPath(higherPoints), lowerPath: toPath(lowerPoints) };

  }, [data]);

  if (loading) return <div className="h-24 bg-surface rounded-md animate-pulse"></div>;

  return (
    <div className="relative h-24 w-full">
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="absolute w-full h-full">
        <defs>
          <linearGradient id="higherGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="lowerGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="var(--danger)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        
        {/* Fill under the path */}
        <path d={chartData.higherPath + ` L 100,50 L 0,50 Z`} fill="url(#higherGradient)" />
        <path d={chartData.lowerPath + ` L 100,50 L 0,50 Z`} fill="url(#lowerGradient)" />

        {/* The line itself */}
        <path d={chartData.higherPath} fill="none" stroke="var(--success)" strokeWidth="0.5" className="draw-line" />
        <path d={chartData.lowerPath} fill="none" stroke="var(--danger)" strokeWidth="0.5" className="draw-line" />
      </svg>
    </div>
  );
};

ParticipationTrendChart.propTypes = {
  eventId: PropTypes.number.isRequired,
};

export default ParticipationTrendChart;