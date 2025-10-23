import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const Participation = ({ event, selectedPrediction, selectedEntryFee, setSelectedEntryFee }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const STAKE_OPTIONS = [100, 200, 500, 1000];

  // Load user points from localStorage
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserPoints = userData.points || 0;

  // Check if event is still active
  const now = new Date();
  const endTime = new Date(event.end_time);
  const isEventActive = now < endTime && event.status === 'active';

  const canPlaceBet = () => {
    return isEventActive && currentUserPoints >= selectedEntryFee;
  };

  const getErrorMessage = () => {
    if (!isEventActive) {
      return 'This event has ended. No more bets can be placed.';
    }
    if (selectedEntryFee > currentUserPoints) {
      return `Insufficient points. You need ${selectedEntryFee - currentUserPoints} more points.`;
    }
    return '';
  };

  const handleSubmit = async () => {
    if (!selectedPrediction || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      if (!token) throw new Error('User not authenticated');
      
      // Validate entry fee structure
      if (typeof selectedEntryFee !== 'number' || selectedEntryFee < 100) {
        throw new Error('Invalid entry fee configuration');
      }
      
      // Check if user has enough points for the bet
      if (!canPlaceBet()) {
        setError(getErrorMessage());
        return;
      }
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/events/${event.id}/bet`,
        {
          prediction: selectedPrediction.value,
          entryFee: selectedEntryFee,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // On success, update user points and show success message
      const updatedUserData = {
        ...userData,
        points: userData.points - selectedEntryFee,
        lastBet: {
          eventId: event.id,
          amount: selectedEntryFee,
          timestamp: new Date().toISOString()
        }
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUserData));
      
      // Update global points state
      window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: updatedUserData.points }));
      
      // Refresh event data to update prize pool and participant count
      window.dispatchEvent(new CustomEvent('refreshEvents'));
      
      // Show success message
      alert(`Successfully placed ${selectedEntryFee} PTS bet on ${selectedPrediction.label}!`);
      
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'An unexpected error occurred.';
      setError(errorMessage);
      console.error('Bet submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white">Confirm Your Prediction</h3>
        <p className="text-gray-400 text-sm">Event: "{event.title}"</p>
      </div>

      {/* Prediction Summary */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <p className="text-gray-400 text-sm">Your Prediction</p>
        <p className="text-white text-xl font-semibold">{selectedPrediction.label}</p>
      </div>

      {/* User Points */}
      <div className="text-center mb-6">
        <p className="text-gray-400 text-sm">Your available balance</p>
        <p className="text-primary text-3xl font-bold">{currentUserPoints.toLocaleString()} PTS</p>
      </div>

      {/* Stake Selection */}
      <div className="mb-6">
        <h4 className="text-center text-gray-300 mb-4">Select Your Stake</h4>
        <div className="grid grid-cols-4 gap-2">
          {STAKE_OPTIONS.map((stake) => (
            <button
              key={stake}
              onClick={() => setSelectedEntryFee(stake)}
              className={`py-3 px-2 rounded-lg text-center font-semibold transition-all duration-200 ${
                selectedEntryFee === stake
                  ? 'bg-primary text-white ring-2 ring-primary-focus'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              disabled={stake > currentUserPoints || !isEventActive}
            >
              {stake}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {getErrorMessage() && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-center mb-6">
          {getErrorMessage()}
        </div>
      )}

      {/* Potential Winnings */}
      <div className="text-center mb-6">
          <p className="text-gray-400 text-sm">Potential Winnings</p>
          <p className="text-green-400 text-2xl font-bold">
            {/* This is a simplified example. You can replace with actual calculation logic. */}
            ~{(selectedEntryFee * 1.8).toLocaleString()} PTS
          </p>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !canPlaceBet()}
        className="w-full bg-primary hover:bg-primary-focus text-white font-bold py-3 px-4 rounded-lg text-lg transition-all duration-200
      disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014
      12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting...
          </>
        ) : (
          `Place Bet for ${selectedEntryFee} PTS`
        )}
      </button>

      {error && <p className="text-red-400 text-center mt-4">{error}</p>}
    </div>
  );
};

Participation.propTypes = {
  event: PropTypes.object.isRequired,
  selectedPrediction: PropTypes.object.isRequired,
  selectedEntryFee: PropTypes.number.isRequired,
  setSelectedEntryFee: PropTypes.func.isRequired,
};

export default Participation;