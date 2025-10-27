import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import useAnimatedCounter from '../hooks/useAnimatedCounter';

const PredictionModal = ({ isOpen, onClose, selectedPrediction, event, currentUserPoints, onSubmit }) => {
  const [stake, setStake] = useState(100);
  const potentialWinnings = useAnimatedCounter(stake * (event.multiplier || 1.8)); // Example multiplier
  const STAKE_OPTIONS = [100, 200, 500, 1000];

  const handleStakeChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setStake(Number(value));
  };

  if (!selectedPrediction) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-gray-900 w-full rounded-t-2xl p-6 pt-8 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold">{selectedPrediction.label}</h3>
              <p className="text-gray-400">Your prediction for: {event.title}</p>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white">{selectedPrediction.label}</h3>
              <p className="text-gray-400">Your prediction for: {event.title}</p>
            </div>

            {/* Stake Input Section */}
            <div className="text-center mb-8">
              <div className="relative mb-6">
                <input
                  type="text"
                  value={stake}
                  onChange={handleStakeChange}
                  className="bg-gray-800 text-6xl font-bold w-full text-center focus:outline-none py-4 px-6 rounded-lg text-white border-2 border-gray-700 focus:border-primary"
                  style={{ caretColor: 'var(--primary)' }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">
                  PTS
                </span>
              </div>
              
              {/* Predefined Stake Options */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {STAKE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setStake(option)}
                    className={`py-3 px-2 rounded-lg text-center font-semibold transition-all duration-200 ${
                      stake === option
                        ? 'bg-primary text-white ring-2 ring-primary-focus'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    disabled={option > currentUserPoints}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <p className="text-gray-400">
                Potential Winnings: <span className="text-green-400 font-semibold">~{Math.round(potentialWinnings)} PTS</span>
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Your balance: {currentUserPoints.toLocaleString()} PTS
              </p>
            </div>

            {/* Confirm Button */}
            <div className="mb-4">
              <button
                onClick={() => onSubmit(stake)}
                disabled={stake > currentUserPoints || stake < 100}
                className="w-full bg-primary hover:bg-primary-focus text-white font-bold py-4 px-6 rounded-lg text-lg transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Confirm Bet for {stake} PTS
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

PredictionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedPrediction: PropTypes.object,
  event: PropTypes.object.isRequired,
  currentUserPoints: PropTypes.number.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default PredictionModal;