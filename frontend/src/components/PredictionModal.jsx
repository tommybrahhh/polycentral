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
          className="fixed inset-0 bg-black/75 z-50 flex items-end backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-ui-surface w-full rounded-t-2xl p-6 pt-8 text-off-white border-t border-ui-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold">{selectedPrediction.label}</h3>
              <p className="text-light-gray">Your prediction for: {event.title}</p>
            </div>

            {/* Stake Input Section */}
            <div className="bg-ui-surface p-4 rounded-lg mb-4">
              <div className="text-center">
                <div className="relative mb-6">
                  <input
                    type="text"
                    value={stake}
                    onChange={handleStakeChange}
                    className="bg-ui-surface text-6xl font-bold w-full text-center focus:outline-none py-4 px-6 rounded-lg text-off-white border-2 border-ui-border focus:border-orange-primary"
                    style={{ caretColor: 'var(--primary)' }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-light-gray">
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
                          ? 'bg-orange-primary text-dark-charcoal ring-2 ring-orange-primary'
                          : 'bg-ui-surface text-light-gray hover:bg-gray-600'
                      }`}
                      disabled={option > currentUserPoints}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <p className="text-light-gray">
                  Potential Winnings: <span className="text-success font-semibold">~{Math.round(potentialWinnings)} PTS</span>
                </p>
                <p className="text-light-gray text-sm mt-1">
                  Your balance: {currentUserPoints.toLocaleString()} PTS
                </p>
              </div>
            </div>

            {/* Confirm Button */}
            <div className="bg-ui-surface p-4 rounded-lg mb-4" style={{ opacity: 1, pointerEvents: 'auto' }}>
              <button
                onClick={() => onSubmit(stake)}
                disabled={stake > currentUserPoints || stake < 100}
                className="w-full bg-orange-primary hover:bg-orange-600 text-black font-bold py-4 px-6 rounded-lg text-lg transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed !opacity-100"
                style={{ opacity: 1, pointerEvents: 'auto' }}
              >
                Participate for {stake} PTS
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