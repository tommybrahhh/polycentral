// src/components/LiveActivityTicker.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

const fakeUsernames = ['CryptoKing', 'DiamondHandz', 'SatoshiJr', 'RocketMan', 'WhaleWatcher', 'ToTheMoon'];
const fakeActions = ['just predicted 0-3% up', 'just bet on 5%+ down', 'entered with 500 PTS', 'is backing the bears', 'is feeling bullish'];

const LiveActivityTicker = ({ participants }) => {
  // Generate a memoized list of fake activities to keep it stable on re-renders
  const activities = useMemo(() => {
    if (participants === 0) return ['Be the first to make a prediction!'];
    
    return Array.from({ length: Math.min(participants, 10) }, (_, i) => {
      const user = fakeUsernames[(i * 3 + participants) % fakeUsernames.length];
      const action = fakeActions[(i * 2 + participants) % fakeActions.length];
      return `${user} ${action}`;
    });
  }, [participants]);

  // Duplicate the list for a seamless loop
  const tickerItems = [...activities, ...activities];

  return (
    <div className="w-full bg-charcoal h-10 rounded-md overflow-hidden relative">
      <div className="absolute top-0 left-0 h-full w-full flex items-center ticker-track">
        {tickerItems.map((text, i) => (
          <div key={i} className="flex-shrink-0 mx-6 text-secondary items-center flex">
            <span className="text-orange-primary mr-2 text-lg font-bold animate-pulse">●</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

LiveActivityTicker.propTypes = {
  participants: PropTypes.number.isRequired,
};

export default LiveActivityTicker;