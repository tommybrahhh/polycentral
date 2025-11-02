import React, { useState } from 'react';
import PropTypes from 'prop-types';

const BetSlip = ({ selectedPrediction, currentUserPoints, onSubmit }) => {
  const [stake, setStake] = useState(100);

  const handleStakeChange = (e) => {
    setStake(Number(e.target.value));
  };

  const potentialReward = (stake * (selectedPrediction.multiplier || 0)).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-secondary">Your Potential Reward</p>
        <p className="text-success font-bold text-3xl">${potentialReward}</p>
        <p className="text-secondary text-sm">
          for a {stake} PTS entry on <span className="font-bold text-primary">{selectedPrediction.label}</span>
        </p>
      </div>
      <div>
        <label htmlFor="stake-amount" className="block text-sm font-medium text-secondary mb-1">Amount (PTS)</label>
        <select
          id="stake-amount"
          value={stake}
          onChange={handleStakeChange}
          className="w-full p-2 rounded-md bg-charcoal border border-gray-600 focus:ring-orange-primary focus:border-orange-primary"
        >
          <option value="100">100</option>
          <option value="200">200</option>
          <option value="500">500</option>
          <option value="1000">1000</option>
        </select>
      </div>
      <button 
        onClick={() => onSubmit(stake)}
        className="btn btn-primary w-full py-3"
        disabled={stake > currentUserPoints}
      >
        {stake > currentUserPoints ? 'Insufficient Points' : 'Place Bet'}
      </button>
    </div>
  );
};

BetSlip.propTypes = {
  selectedPrediction: PropTypes.object.isRequired,
  currentUserPoints: PropTypes.number.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default BetSlip;