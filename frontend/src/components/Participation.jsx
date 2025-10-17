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
    <div className="space-y-lg">
      {/* User Points Display */}
      <div className="text-center">
        <p className="text-primary text-xl font-semibold">{currentUserPoints.toLocaleString()} points</p>
        <p className="text-secondary text-sm">Your available balance</p>
      </div>

      {/* Entry Stake Selection */}
      <div>
        <h4 className="text-center text-secondary mb-md">Select Entry Stake</h4>
        <div className="grid grid-cols-4 gap-sm">
          {STAKE_OPTIONS.map((stake) => (
            <button
              key={stake}
              onClick={() => setSelectedEntryFee(stake)}
              className={`btn ${selectedEntryFee === stake ? 'btn-primary' : 'btn-secondary'}`}
              disabled={stake > currentUserPoints || !isEventActive}
            >
              {stake}
            </button>
          ))}
        </div>
      </div>
      
      {/* Error Message */}
      {getErrorMessage() && (
        <div className="alert alert-danger">{getErrorMessage()}</div>
      )}

      {/* Final Call to Action Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !canPlaceBet()}
        className="btn btn-primary w-full text-lg"
      >
        {isSubmitting ? 'Submitting...' : `Confirm Prediction for ${selectedEntryFee} PTS`}
      </button>

      {error && <p className="form-error text-center">{error}</p>}
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