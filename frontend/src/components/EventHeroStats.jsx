// src/components/EventHeroStats.jsx

import React from 'react';
import PropTypes from 'prop-types';
import useAnimatedCounter from '../hooks/useAnimatedCounter';

const EventHeroStats = ({ prizePool, participants }) => {
  const animatedPool = useAnimatedCounter(prizePool);
  const animatedParticipants = useAnimatedCounter(participants);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-center bg-surface p-4 sm:p-6 rounded-md">
      <div>
        <h3 className="text-secondary text-base sm:text-lg">Current Prize Pool</h3>
        <p
          className="text-4xl sm:text-5xl font-bold text-primary tracking-wider"
          style={{ textShadow: '0 0 12px var(--success-glow, rgba(46, 204, 113, 0.6))' }}
        >
          ${animatedPool.toLocaleString()}
        </p>
      </div>
      <div className="mt-4 md:mt-0">
        <h3 className="text-secondary text-base sm:text-lg">Active Participants</h3>
        <p className="text-4xl sm:text-5xl font-bold text-primary">
          {animatedParticipants.toLocaleString()}
        </p>
        <button className="btn btn-secondary mt-2">Join them now!</button>
      </div>
    </div>
  );
};

EventHeroStats.propTypes = {
  prizePool: PropTypes.number.isRequired,
  participants: PropTypes.number.isRequired,
};

export default EventHeroStats;