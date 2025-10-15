import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

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

  // Parse event options if they exist
  const eventOptions = React.useMemo(() => {
    if (event.options) {
        try {
            let parsedOptions;
            if (typeof event.options === 'string') {
                parsedOptions = JSON.parse(event.options);
            } else {
                parsedOptions = event.options;
            }

            // FIX: Check if the options are just strings and convert them to objects
            if (Array.isArray(parsedOptions) && typeof parsedOptions[0] === 'string') {
                return parsedOptions.map(opt => ({
                    id: opt.toLowerCase().replace(/ /g, '_'), // Create a simple ID
                    label: opt,
                    value: opt
                }));
            }
            
            // If it's already an array of objects, return it
            if (Array.isArray(parsedOptions)) {
                return parsedOptions;
            }
        } catch (e) {
            console.error('Failed to parse event options:', e);
            return []; // Return empty array on error
        }
    }
    // Fallback to default options if none are provided
    return [
      { id: 'range_0_3_up', label: '0-3% Up', value: '0-3% up' },
      { id: 'range_3_5_up', label: '3-5% Up', value: '3-5% up' },
      { id: 'range_5_up', label: '5%+ Up', value: '>5% up' },
      { id: 'range_0_3_down', label: '0-3% Down', value: '0-3% down' },
      { id: 'range_3_5_down', label: '3-5% Down', value: '3-5% down' },
      { id: 'range_5_down', label: '5%+ Down', value: '>5% down' }
    ];
  }, [event.options]);

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
      
      setBetStatus('success');
      setSelectedPrediction(null); // Reset selection after successful bet
      
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
      // We need to get the fetchEvents function from the parent context
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
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'Bet placed successfully!';
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        toast.remove();
      }, 3000);
      
      setTimeout(() => setBetStatus(null), 3000);
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
    <div className="betting-interface">
      <div className="balance-display">
        <div className="balance-amount">{userPoints.toLocaleString()} points</div>
        <div className="fee-breakdown">
          <span className="entry-fee ${userPoints >= selectedEntryFee ? '' : 'low-balance'}">
            Entry: {selectedEntryFee?.toLocaleString()}
          </span>
          <span className="platform-fee">
            (5% fee: {Math.floor(selectedEntryFee * 0.05)?.toLocaleString()})
          </span>
        </div>
      </div>

      <div className="entry-fee-section">
        <h3 className="fee-select-title">Select Entry Stake</h3>
        <div className="stake-grid">
          {[100, 200, 500, 1000].map((fee) => (
            <button
              key={fee}
              className={`action-button ${selectedEntryFee === fee ? 'active' : ''}`}
              onClick={() => setSelectedEntryFee(fee)}
              disabled={fee > userPoints || !isEventActive}
            >
              {fee.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {getErrorMessage() && (
        <div className="error-banner">{getErrorMessage()}</div>
      )}

      <div className="prediction-section">
        <div className="prediction-grid">
          {eventOptions.map((option) => (
            <button
              key={option.id || option.value}
              className={`prediction-card ${selectedPrediction === option.value ? 'selected' : ''} ${
                option.value.includes('up') ? 'bullish' : 'bearish'
              }`}
              onClick={() => setSelectedPrediction(option.value)}
              disabled={!canPlaceBet() || betStatus === 'success'}
            >
              <span className="prediction-label">{option.label || option.value}</span>
              <span className="odds-indicator">2.5x</span>
              <div className="fee-disclaimer">
                * Includes 5% platform fee
              </div>
            </button>
          ))}
        </div>

        <button
          className={`cta-bet-button ${!selectedPrediction ? 'disabled' : ''}`}
          onClick={handleBet}
          disabled={!canPlaceBet() || betStatus === 'success' || !selectedPrediction}
        >
          {selectedPrediction ? `Confirm ${selectedEntryFee}pt Bet` : 'Select Prediction'}
        </button>
      </div>

      {betStatus === 'success' && (
        <div className="success-overlay">
          <div className="success-message">
            <div className="confetti-animation"></div>
            Bet Placed Successfully!
          </div>
        </div>
      )}
    </div>
  );
};


Participation.propTypes = {
  event: PropTypes.object.isRequired,
  selectedEntryFee: PropTypes.number.isRequired,
  setSelectedEntryFee: PropTypes.func.isRequired
};

export default Participation;