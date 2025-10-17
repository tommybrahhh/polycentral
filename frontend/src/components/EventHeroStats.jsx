// src/components/EventHeroStats.jsx

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// Custom hook for smooth number animation
const useAnimatedCounter = (targetValue, duration = 1000) => {
  const [count, setCount] = useState(0);
  const frameRef = useRef();

  useEffect(() => {
    const start = count;
    const end = targetValue;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      setCount(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [targetValue, duration]);

  return count;
};

const EventHeroStats = ({ prizePool, participants }) => {
  const animatedPool = useAnimatedCounter(prizePool);
  const animatedParticipants = useAnimatedCounter(participants);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-center bg-surface p-lg rounded-md">
      <div>
        <h3 className="text-secondary text-lg">Current Prize Pool</h3>
        <p className="text-4xl font-bold text-primary tracking-wider">
          ${animatedPool.toLocaleString()}
        </p>
        <div className="h-1 bg-gradient-to-r from-orange-primary to-success rounded-full mt-2 mx-auto w-1/2"></div>
      </div>
      <div className="mt-md md:mt-0">
        <h3 className="text-secondary text-lg">Active Participants</h3>
        <p className="text-4xl font-bold text-primary">
          {animatedParticipants.toLocaleString()}
        </p>
         <p className="text-sm text-secondary mt-1">Join them now!</p>
      </div>
    </div>
  );
};

EventHeroStats.propTypes = {
  prizePool: PropTypes.number.isRequired,
  participants: PropTypes.number.isRequired,
};

export default EventHeroStats;