import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { normalizeEventOptions } from '../utils/eventUtils'; // Adjust path if necessary

const Participation = ({ event, selectedEntryFee, setSelectedEntryFee }) => {
  const [betStatus, setBetStatus] = useState(null); // 'success', 'error', or null
  const [userPoints, setUserPoints] = useState(0);
  const [isEventActive, setIsEventActive] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  // Load user points from localStorage
  React.useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUserPoints(userData.points || 0);
    
    // Check if event is still active
    const now = new Date();
    const endTime = new Date(event.end_time);
    setIsEventActive(now < endTime && event.status === 'active');
  }, [event]);

  // Parse event options using the centralized utility function
  const eventOptions = React.useMemo(() => normalizeEventOptions(event.options), [event.options]);

  const canPlaceBet = () => {
    return isEventActive && userPoints >= selectedEntryFee;
  };

  const getErrorMessage = () => {
    if (!isEventActive) {
      return 'This event has ended. No more bets can be placed.';
    }
    if (selectedEntryFee > userPoints) {
      return `Insufficient points. You need ${selectedEntryFee - userPoints} more points.`;
    }
    return '';
  };

  const handleBet = async () => {
    if (!selectedPrediction) {
      setBetStatus('error');
      setTimeout(() => setBetStatus(null), 3000);
      return;
    }
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('User not authenticated');
      
      // Validate entry fee structure
      if (typeof selectedEntryFee !== 'number' || selectedEntryFee < 100) {
        throw new Error('Invalid entry fee configuration');
      }
      
      // Check if user has enough points for the bet
      if (!canPlaceBet()) {
        setBetStatus('error');
        setTimeout(() => setBetStatus(null), 3000);
        return;
      }
      
      // Add button press animation
      const button = document.activeElement;
      if (button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
          if (button) button.style.transform = '';
        }, 150);
      }
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/events/${event.id}/bet`,
        { prediction: selectedPrediction, entryFee: selectedEntryFee },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setBetStatus('success'); // Briefly set for visual feedback if needed
      setSelectedPrediction(null); // Reset the selected button immediately
      
      // Fetch updated user data from the server to ensure points are accurate
      try {
        const userResponse = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/user/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Update user points with the actual server value
        const updatedUserData = {
          ...JSON.parse(localStorage.getItem('user') || '{}'),
          points: userResponse.data.points,
          lastBet: {
            eventId: event.id,
            amount: selectedEntryFee,
            timestamp: new Date().toISOString()
          }
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        setUserPoints(updatedUserData.points);
        
        // Update global points state
        window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: updatedUserData.points }));
      } catch (userError) {
        console.error('Failed to fetch updated user data:', userError);
        // Fallback to local calculation if server fetch fails
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.points = userData.points - selectedEntryFee;
        localStorage.setItem('user', JSON.stringify(userData));
        setUserPoints(userData.points);
        
        // Update global points state
        window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: userData.points }));
      }
      
      // Refresh event data to update prize pool and participant count
      const eventUpdateEvent = new CustomEvent('refreshEvents');
      window.dispatchEvent(eventUpdateEvent);
      
      // Add celebration effect for successful bet
      const eventCard = document.querySelector('.card');
      if (eventCard) {
        eventCard.style.transform = 'scale(1.02)';
        setTimeout(() => {
          eventCard.style.transform = '';
        }, 200);
      }
      
      // Show a more encouraging success toast
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'Bet placed! Feel free to place another.';
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        toast.remove();
      }, 3000);
      
      // Reset the bet status quickly so the button is re-enabled
      setTimeout(() => setBetStatus(null), 500);
    } catch (error) {
      console.error('Betting failed:', error);
      setBetStatus('error');
      
      // Add shake effect for error
      const eventCard = document.querySelector('.card');
      if (eventCard) {
        eventCard.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
          eventCard.style.animation = '';
        }, 500);
      }
      
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = error.response?.data?.error || 'Failed to place bet. Try again.';
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        toast.remove();
      }, 3000);
      
      setTimeout(() => setBetStatus(null), 3000);
    }
  };

  return (
    <div className="space-y-lg">
      <div className="bg-surface p-md rounded-md text-center">
        <div className="text-primary font-bold text-xl mb-sm">{userPoints.toLocaleString()} points</div>
        <div className="text-secondary text-sm">
          <span className={userPoints >= selectedEntryFee ? '' : 'text-danger'}>
            Entry: {selectedEntryFee?.toLocaleString()} points
          </span>
        </div>
      </div>

      <div className="text-center">
        <h4 className="text-secondary mb-md">Select Entry Stake</h4>
        <div className="flex flex-wrap gap-sm justify-center">
          {[100, 200, 500, 1000].map((fee) => (
            <button
              key={fee}
              className={`btn ${selectedEntryFee === fee ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedEntryFee(fee)}
              disabled={fee > userPoints || !isEventActive}
            >
              {fee.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {getErrorMessage() && (
        <div className="alert alert-danger">{getErrorMessage()}</div>
      )}

      <div className="space-y-md">
        <div className="grid grid-cols-2 gap-md">
          {eventOptions.map((option) => (
            <button
              key={option.id || option.value}
              className={`card text-center p-md cursor-pointer transition-all hover:scale-105 ${
                selectedPrediction === option.value ? 'ring-2 ring-orange-primary' : ''
              } ${option.value.includes('up') ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}
              onClick={() => setSelectedPrediction(option.value)}
              disabled={!canPlaceBet() || betStatus === 'success'}
            >
              <span className="block font-semibold text-primary">{option.label || option.value}</span>
              <span className="block text-secondary text-sm mt-sm">2.5x potential</span>
            </button>
          ))}
        </div>

        <button
          className={`btn btn-lg w-full ${
            !selectedPrediction ? 'btn-secondary opacity-50' : 'btn-primary'
          }`}
          onClick={handleBet}
          disabled={!canPlaceBet() || betStatus === 'success' || !selectedPrediction}
        >
          {selectedPrediction ? `Confirm ${selectedEntryFee}pt Bet` : 'Select Prediction'}
        </button>
      </div>

    </div>
  );
};


Participation.propTypes = {
  event: PropTypes.object.isRequired,
  selectedEntryFee: PropTypes.number.isRequired,
  setSelectedEntryFee: PropTypes.func.isRequired
};

export default Participation;