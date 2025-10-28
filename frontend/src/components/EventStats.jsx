import React from 'react';
import PropTypes from 'prop-types';
import useAnimatedCounter from '../hooks/useAnimatedCounter';

const EventStats = ({ prizePool, participants, entryFee }) => {
  const animatedPool = useAnimatedCounter(prizePool);
  const animatedParticipants = useAnimatedCounter(participants);

  return (
    <div className="grid grid-cols-3 gap-4 text-center bg-surface p-4 rounded-lg">
      <div>
        <h4 className="text-secondary text-xs sm:text-sm mb-1">Prize Pool</h4>
        <p className="text-lg sm:text-xl font-bold text-primary">${animatedPool.toLocaleString()}</p>
      </div>
      <div>
        <h4 className="text-secondary text-xs sm:text-sm mb-1">Participants</h4>
        <p className="text-lg sm:text-xl font-bold text-primary">{animatedParticipants.toLocaleString()}</p>
      </div>
      <div>
        <h4 className="text-secondary text-xs sm:text-sm mb-1">Entry Fee</h4>
        <p className="text-lg sm:text-xl font-bold text-primary">{entryFee} PTS</p>
      </div>
    </div>
  );
};

EventStats.propTypes = {
  prizePool: PropTypes.number.isRequired,
  participants: PropTypes.number.isRequired,
  entryFee: PropTypes.number.isRequired,
};

export default EventStats;