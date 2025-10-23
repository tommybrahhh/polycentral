import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import SwipeToConfirm from './SwipeToConfirm';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';

const PredictionModal = ({ isOpen, onClose, selectedPrediction, event, currentUserPoints, onSubmit }) => {
  const [stake, setStake] = useState(100);
  const potentialWinnings = useAnimatedCounter(stake * (event.multiplier || 1.8)); // Example multiplier

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

            <div className="text-center my-12">
              <div className="relative">
                <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-5xl font-bold text-gray-600">
                  PTS
                </span>
                <input
                  type="text"
                  value={stake}
                  onChange={handleStakeChange}
                  className="bg-transparent text-7xl font-bold w-full text-center focus:outline-none"
                  style={{ caretColor: 'var(--primary)' }}
                />
              </div>
              <p className="text-gray-400 mt-2">
                Potential Winnings: <span className="text-green-400 font-semibold">~{Math.round(potentialWinnings)} PTS</span>
              </p>
            </div>

            <div className="mb-4">
              <SwipeToConfirm onConfirm={() => onSubmit(stake)} />
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