// src/components/ActivityMeter.jsx

import React from 'react';
import PropTypes from 'prop-types';

const ActivityMeter = ({ prizePool, participants }) => {
  // Normalize values for visual representation. These are arbitrary and can be tuned.
  const poolScale = Math.log10(prizePool + 1) / 5; // Log scale for prize pool
  const participantsScale = Math.log10(participants + 1) / 3; // Log scale for participants

  // Determine the activity level based on a combined score
  const score = (poolScale + participantsScale) / 2;
  
  let activityLevel = 'Low';
  let meterColor = 'bg-gray-500';
  let icon = '❄️';

  if (score > 0.6) {
    activityLevel = 'High';
    meterColor = 'bg-success';
    icon = '🔥';
  } else if (score > 0.3) {
    activityLevel = 'Medium';
    meterColor = 'bg-orange-primary';
    icon = '⚡';
  }

  const meterWidth = Math.min(score * 100, 100);

  return (
    <div className="bg-surface p-md rounded-md">
      <h3 className="text-center mb-md">Event Activity</h3>
      <div className="flex items-center gap-4">
        <div className="text-3xl">{icon}</div>
        <div className="flex-grow">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-primary">{activityLevel} Activity</span>
            <span className="text-secondary">{participants.toLocaleString()} Participants</span>
          </div>
          <div className="w-full bg-charcoal rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${meterColor}`}
              style={{ width: `${meterWidth}%` }}
            ></div>
          </div>
          <div className="text-center text-secondary text-sm mt-2">
            Current Prize Pool: <strong>💰 ${prizePool.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

ActivityMeter.propTypes = {
  prizePool: PropTypes.number.isRequired,
  participants: PropTypes.number.isRequired,
};

export default ActivityMeter;