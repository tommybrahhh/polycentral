// src/components/EventHeroStats.jsx

import React from 'react';
import PropTypes from 'prop-types';
import useAnimatedCounter from '../hooks/useAnimatedCounter'; // Assuming hook is moved to a separate file

const EventHeroStats = ({ prizePool, participants }) => {
  const animatedPool = useAnimatedCounter(prizePool);
  const animatedParticipants = useAnimatedCounter(participants);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-center bg-surface p-lg rounded-md">
      <div>
        <h3 className="text-secondary text-lg">Current Prize Pool</h3>
        <p
          className="text-5xl font-bold text-primary tracking-wider"
          style={{ textShadow: '0 0 12px var(--success-glow, rgba(46, 204, 113, 0.6))' }}
        >
          ${animatedPool.toLocaleString()}
        </p>
      </div>
      <div className="mt-md md:mt-0">
        <h3 className="text-secondary text-lg">Active Participants</h3>
        <p className="text-5xl font-bold text-primary">
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