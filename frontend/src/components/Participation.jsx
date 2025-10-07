import React, { useState } from 'react';
import axios from 'axios';

const Participation = ({ event }) => {
  const [betStatus, setBetStatus] = useState(null); // 'success', 'error', or null
  const [userPoints, setUserPoints] = useState(0);
  const [isEventActive, setIsEventActive] = useState(true);
  const [selectedEntryFee, setSelectedEntryFee] = useState(event.entry_fee || 100);

  // Load user points from localStorage
  React.useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUserPoints(userData.points || 0);
    
    // Check if event is still active
    const now = new Date();
    const endTime = new Date(event.end_time);
    setIsEventActive(now < endTime && event.status === 'active');
  }, [event]);

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

  // Update handleBet function to use selected bet amount
  const handleBet = async (prediction) => {
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
        { prediction, entryFee: selectedEntryFee },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setBetStatus('success');
      
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
    <div className="participation-container">
      {/* User Balance Information */}
      <div className="user-info-display">
        Your Balance: {userPoints.toLocaleString()} points /
        <span className={userPoints >= selectedEntryFee ? '' : 'insufficient-points'}>
          Entry: {typeof selectedEntryFee === 'number' ? selectedEntryFee : 'N/A'} points
        </span>
      </div>
      
      {/* Entry Fee Selection */}
      <div className="entry-fee-selection">
        <label className="entry-fee-label">Entry Fee:</label>
        <div className="entry-fee-options">
          {[100, 200, 500, 1000].map((fee) => (
            <button
              key={fee}
              className={`entry-fee-option ${selectedEntryFee === fee ? 'selected' : ''}`}
              onClick={() => setSelectedEntryFee(fee)}
              disabled={fee > userPoints || !isEventActive}
            >
              {fee} points
            </button>
          ))}
        </div>
      </div>
      
      {/* Error Message */}
      {getErrorMessage() && (
        <div className="form-error">{getErrorMessage()}</div>
      )}
      
      {/* Prediction Buttons */}
      <div className="prediction-buttons-container">
        <button
          className="prediction-button higher button button-primary"
          onClick={() => handleBet('Higher')}
          disabled={!canPlaceBet() || betStatus === 'success'}
        >
          <span className="arrow-icon">↑</span>
          Higher
        </button>
        <button
          className="prediction-button lower button button-primary"
          onClick={() => handleBet('Lower')}
          disabled={!canPlaceBet() || betStatus === 'success'}
        >
          <span className="arrow-icon">↓</span>
          Lower
        </button>
      </div>
      
      {/* Status Messages */}
      {betStatus === 'success' && (
        <div className="form-success">Bet placed successfully!</div>
      )}
      {betStatus === 'error' && (
        <div className="form-error">Failed to place bet. Try again.</div>
      )}
    </div>
  );
};

export default Participation;