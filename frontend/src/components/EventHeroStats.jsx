// src/components/EventHeroStats.jsx

import React from 'react';
import PropTypes from 'prop-types';

const EventHeroStats = ({ prizePool, participants }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-center bg-surface p-lg rounded-md">
      <div>
        <h3 className="text-secondary text-lg">Current Prize Pool</h3>
        <p className="text-3xl font-bold text-primary tracking-wider">
          ${prizePool.toLocaleString()}
        </p>
        <div className="h-1 bg-gradient-to-r from-orange-primary to-success rounded-full mt-2 mx-auto w-1/2"></div>
      </div>
      <div className="mt-md md:mt-0">
        <h3 className="text-secondary text-lg">Participants</h3>
        <p className="text-3xl font-bold text-primary">
          {participants.toLocaleString()}
        </p>
        <p className="text-sm text-secondary mt-1">Already predicting!</p>
      </div>
    </div>
  );
};

EventHeroStats.propTypes = {
  prizePool: PropTypes.number.isRequired,
  participants: PropTypes.number.isRequired,
};

export default EventHeroStats;