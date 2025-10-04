import React, { useState, useEffect } from 'react';
import { useTournaments } from './hooks/useTournaments';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './index.css';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const FeeDisplay = ({ fee, variant = 'default' }) => (
  <div className={`fee-display ${variant} flex items-center gap-1 text-sm sm:text-base`}>
    <span className="font-medium">Entry Fee:</span>
    <span className="font-bold text-emerald-600">{fee} points</span>
  </div>
);

const FeeControls = ({ value, onChange }) => {
  const handleIncrement = () => onChange(Math.max(100, value + 25));
  const handleDecrement = () => onChange(Math.max(100, value - 25));

  const handleChange = (e) => {
    const newValue = parseInt(e.target.value) || 0;
    onChange(Math.max(100, newValue));
  };

  const handleBlur = () => {
    const roundedValue = Math.floor(value / 25) * 25;
    onChange(Math.max(100, roundedValue));
  };

  return (
    <div className="entry-fee-controls flex gap-2 items-center">
      <button
        type="button"
        onClick={handleDecrement}
        className="button button-secondary px-3 py-1 sm:px-4 sm:py-2"
        aria-label="Decrease entry fee by 25 points"
      >
        -25
      </button>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        min="100"
        step="25"
        className="form-input w-20 text-center"
        aria-label="Entry fee amount"
      />
      <button
        type="button"
        onClick={handleIncrement}
        className="button button-primary px-3 py-1 sm:px-4 sm:py-2"
        aria-label="Increase entry fee by 25 points"
      >
        +25
      </button>
    </div>
  );
};

// Create a client
const queryClient = new QueryClient();

// Main App Component
const App = () => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [points, setPoints] = useState(0);
  const [events, setEvents] = useState([]);
  const { loadingStates } = useTournaments();
  const [username, setUsername] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTestButton, setShowTestButton] = useState(true); // Show test button for development

  // This function checks if a wallet is connected when the app loads
  const checkIfWalletIsConnected = async () => {
    try {
      // First make sure we have access to window.ethereum
      const { ethereum } = window;

      if (!ethereum) {
        console.log("Make sure you have MetaMask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      // Check if we're authorized to access the user's wallet
      const accounts = await ethereum.request({ method: 'eth_accounts' });

      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // The main function to connect the wallet
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      // Request access to the user's accounts
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };
  
  // Add 404 component
  const NotFound = () => (
    <div className="not-found-container">
      <h2>404 - Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="button button-primary">Back to Home</Link>
    </div>
  );
  
  // This runs our function when the page loads.
  // It also sets up a listener for account changes.
  // Fetch tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events`);
        setEvents(response.data);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      }
    };
    fetchTournaments();
  }, []);

  useEffect(() => {
    // Check for stored user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUsername(userData.username);
      setPoints(userData.points);
    }
    
    checkIfWalletIsConnected();

    const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
            setCurrentAccount(accounts[0]);
        } else {
            setCurrentAccount(null);
        }
    };
    
    // Handler for points updates
    const handlePointsUpdate = (event) => {
      setPoints(event.detail);
    };

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    
    // Add event listener for points updates
    window.addEventListener('pointsUpdated', handlePointsUpdate);
    
    // Cleanup the listeners when the component is unmounted
    return () => {
        if (window.ethereum) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
        window.removeEventListener('pointsUpdated', handlePointsUpdate);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app-container">
          <nav className="main-nav">
          <div className="nav-links">
            <Link to="/events" className="nav-link">Events</Link>
          </div>
          {/* --- User Status Display --- */}
          <div className="user-status">
            {username ? (
              <div className="user-info">
                <span className="username">Hello, {username}!</span>
                <div className="points-display flex flex-col sm:flex-row gap-2">
                  <div className="points-balance text-sm sm:text-base">
                    🪙 <span className="points-amount font-medium">{points}</span> Points
                  </div>
                  <button
                    className="button button-success"
                    onClick={async () => {
                      try {
                        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/user/claim-free-points`, {}, {
                          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
                        });
                        // Animate the points change
                        const oldPoints = points;
                        const newPoints = response.data.newTotal;
                        
                        // Create a smooth animation from old to new points
                        const duration = 1000; // 1 second animation
                        const startTime = Date.now();
                        
                        const animatePoints = () => {
                          const currentTime = Date.now();
                          const elapsed = currentTime - startTime;
                          const progress = Math.min(elapsed / duration, 1);
                          
                          // Easing function for smooth animation
                          const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                          const currentPoints = Math.floor(oldPoints + (newPoints - oldPoints) * easeOutCubic);
                          
                          setPoints(currentPoints);
                          
                          if (progress < 1) {
                            requestAnimationFrame(animatePoints);
                          } else {
                            // Ensure we end with the exact new points value
                            setPoints(newPoints);
                          }
                        };
                        
                        requestAnimationFrame(animatePoints);
                        
                        // Show success toast
                        const toast = document.createElement('div');
                        toast.className = 'toast toast-success show';
                        toast.textContent = response.data.message;
                        document.body.appendChild(toast);
                        
                        // Remove toast after 3 seconds
                        setTimeout(() => {
                          toast.remove();
                        }, 3000);
                      } catch (error) {
                        console.error('Claim failed:', error);
                        
                        // Show error toast
                        const toast = document.createElement('div');
                        toast.className = 'toast toast-error show';
                        toast.textContent = 'Failed to claim points: ' + (error.response?.data?.message || error.message);
                        document.body.appendChild(toast);
                        
                        // Remove toast after 3 seconds
                        setTimeout(() => {
                          toast.remove();
                        }, 3000);
                      }
                    }}
                    title="Claim daily points"
                  >
                    <span className="claim-icon">🎁</span> Claim
                  </button>
                </div>
                <button
                  className="button button-secondary"
                  onClick={() => {
                    // Clear authentication data
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');
                    setUsername('');
                    setPoints(0);
                    
                    // Show success toast
                    const toast = document.createElement('div');
                    toast.className = 'toast toast-success show';
                    toast.textContent = 'Successfully logged out';
                    document.body.appendChild(toast);
                    
                    // Remove toast after 3 seconds
                    setTimeout(() => {
                      toast.remove();
                    }, 3000);
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button
                  className="button button-secondary"
                  onClick={() => setShowRegisterModal(true)}
                >
                  Register
                </button>
                <button
                  className="button button-primary"
                  onClick={() => setShowLoginModal(true)}
                >
                  Login
                </button>
              </div>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/events" element={<EventsInterface />} />
          <Route path="/" element={<EventsInterface />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      
      {showRegisterModal && (
        <RegisterForm onClose={() => setShowRegisterModal(false)} />
      )}
      {showLoginModal && (
        <LoginForm onClose={() => setShowLoginModal(false)} />
      )}
    </Router>
    </QueryClientProvider>
  );
};

// Helper function to determine if an event is closing soon (within 1 hour)
const isEventClosingSoon = (event) => {
  const now = new Date();
  const endTime = new Date(event.end_time);
  const timeDiff = endTime - now; // difference in milliseconds
  const oneHour = 60 * 60 * 1000; // one hour in milliseconds
  return timeDiff > 0 && timeDiff <= oneHour;
};

// Helper function to determine if an event is active (not expired)
const isEventActive = (event) => {
  const now = new Date();
  const endTime = new Date(event.end_time);
  const isActive = now < endTime && event.status !== 'expired';
  console.log(`Event ${event.id} - ${event.title} is ${isActive ? 'active' : 'inactive'}. Now: ${now}, End: ${endTime}, Status: ${event.status}`);
  return isActive;
};

// CountdownTimer component
const CountdownTimer = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isCritical, setIsCritical] = React.useState(false);
  const [isWarning, setIsWarning] = React.useState(false);

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const end = new Date(endTime);
      const difference = end - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    };

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
  
      // Calculate total time in minutes for warning states
      const totalMinutes = newTimeLeft.days * 24 * 60 + newTimeLeft.hours * 60 + newTimeLeft.minutes;
      const totalSeconds = totalMinutes * 60 + newTimeLeft.seconds;
  
      // Set warning states
      const isCriticalState = totalSeconds <= 60; // 1 minute or less
      const isWarningState = totalMinutes <= 60 && totalSeconds > 60; // 1 hour or less but more than 1 minute
      
      console.log(`Countdown for ${endTime}: ${totalMinutes} minutes, ${totalSeconds} seconds. Critical: ${isCriticalState}, Warning: ${isWarningState}`);
      
      setIsCritical(isCriticalState);
      setIsWarning(isWarningState);
    }, 1000);

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [endTime]);

  const formatTime = (value) => {
    return value.toString().padStart(2, '0');
  };

  const getTimeDisplay = () => {
    const { days, hours, minutes, seconds } = timeLeft;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const timerClass = `countdown-timer ${isCritical ? 'critical' : isWarning ? 'warning' : 'normal'}`;

  return (
    <div className={timerClass}>
      <span className="icon">⏰</span>
      <span className="time-display">{getTimeDisplay()}</span>
    </div>
  );
};

// Events Interface Component
const EventsInterface = () => {
  const [events, setEvents] = React.useState([]);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newEvent, setNewEvent] = React.useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    capacity: 100,
    entry_fee: 100
  });

  const fetchEvents = async () => {
    try {
      // IMPORTANT: You might need to provide the full URL in development
      // e.g., axios.get('http://localhost:3001/api/events')
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/active`);
      console.log('EventsInterface fetched events:', response.data);
      // Log the first event to see its structure
      if (response.data && response.data.length > 0) {
        console.log('First event structure:', response.data[0]);
      }
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  React.useEffect(() => {
    fetchEvents();
    
    // Add event listener for refreshing events
    const refreshEventsHandler = () => {
      fetchEvents();
    };
    
    window.addEventListener('refreshEvents', refreshEventsHandler);
    
    return () => {
      window.removeEventListener('refreshEvents', refreshEventsHandler);
    };
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    // Log the entry fee value before submission
    console.log('Entry fee value before submission:', newEvent.entry_fee);
    console.log('Entry fee type:', typeof newEvent.entry_fee);
    
    // Validate entry fee before submission
    const entryFeeValue = parseInt(newEvent.entry_fee);
    console.log('Parsed entry fee value:', entryFeeValue);
    console.log('Is NaN check:', isNaN(entryFeeValue));
    console.log('Is less than 100 check:', entryFeeValue < 100);
    
    if (isNaN(entryFeeValue) || entryFeeValue < 100) {
      console.error('Invalid entry fee value:', newEvent.entry_fee);
      
      // Show error toast for invalid entry fee
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Entry fee must be at least 100 points';
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        toast.remove();
      }, 3000);
      
      return;
    }
    
    try {
      // Transform the newEvent data to match the backend API requirements
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        options: ['Higher', 'Lower'], // Default options for crypto price prediction
        entry_fee: entryFeeValue, // Use validated entry fee
        start_time: newEvent.start_time,
        end_time: newEvent.end_time,
        location: newEvent.location,
        capacity: newEvent.capacity
      };
      
      console.log('Submitting event data:', eventData);
      
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/events`, eventData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      setShowCreateModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = error.response?.data?.error || 'Failed to create event. Try again.';
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }
  };

  // Get the latest event (most recent by end_time)
  const getLatestEvent = () => {
    if (!events || events.length === 0) return null;
    return [...events].sort((a, b) => new Date(b.end_time) - new Date(a.end_time))[0];
  };

  
        return (
      <div className="events-container">
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Event</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)} aria-label="Close modal">
                ×
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="form">
              <div className="modal-body">
                <div className="form-content">
                  <div className="form-group">
                    <label htmlFor="event-title" className="form-label">Event Title</label>
                    <input
                      type="text"
                      id="event-title"
                      required
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="event-description" className="form-label">Description</label>
                    <textarea
                      id="event-description"
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      className="form-input form-textarea"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="event-location" className="form-label">Location</label>
                    <input
                      type="text"
                      id="event-location"
                      required
                      onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="event-start-time" className="form-label">Start Time</label>
                      <input
                        type="datetime-local"
                        id="event-start-time"
                        required
                        onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="event-end-time" className="form-label">End Time</label>
                      <input
                        type="datetime-local"
                        id="event-end-time"
                        required
                        onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="event-capacity" className="form-label">Capacity</label>
                    <input
                      type="number"
                      id="event-capacity"
                      min="1"
                      value={newEvent.capacity}
                      onChange={(e) => setNewEvent({...newEvent, capacity: e.target.value})}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="event-entry-fee" className="form-label">Entry Fee (points)</label>
                    <FeeControls
                      value={newEvent.entry_fee}
                      onChange={(newValue) => setNewEvent({...newEvent, entry_fee: newValue})}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="events-list">
      {events.filter(isEventActive).map(event => (
        <div key={event.id} className="card">
          <div className="card-header">
            <div className="event-header">
              <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                <h3 className="event-title">{event.title}</h3>
                <FeeControls
                  value={event.entry_fee}
                  onChange={(newFee) => {
                    const updatedEvents = events.map(ev =>
                      ev.id === event.id ? {...ev, entry_fee: newFee} : ev
                    );
                    setEvents(updatedEvents);
                  }}
                />
              </div>
              <div className="event-meta">
                <div className="event-info">
                  <span className="participants">👥 {event.current_participants} participants</span>
                  <div className={`status-indicator ${isEventClosingSoon(event) ? 'status-closing' : 'status-active'}`}>
                    <span className="status-dot"></span>
                    • {isEventClosingSoon(event) ? 'Closing Soon' : 'Active'}
                  </div>
                </div>
                <div className="prediction-sentiment-bar">
                  <div className="sentiment-fill higher" style={{ width: '70%' }}></div>
                  <div className="sentiment-fill lower" style={{ width: '30%' }}></div>
                </div>
                <CountdownTimer endTime={event.end_time} />
              </div>
            </div>
          </div>
          <div className="card-body">
            <p className="description">{event.description}</p>
            <div className="event-details">
              <div className="detail">
                <span className="icon">💰</span>
                Pot: ${event.prize_pool?.toLocaleString() || 0}
              </div>
              <div className="detail flex items-center gap-1 text-sm sm:text-base">
                <span className="icon">🎫</span>
                <span className="whitespace-nowrap">Entry: {typeof event.entry_fee === 'number' ? event.entry_fee : 'N/A'}</span>
              </div>
            </div>
            <div className="sparkline-container">
              <svg className="sparkline" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,15 L10,12 L20,14 L30,10 L40,12 L50,8 L60,10 L70,6 L80,8 L90,7 L100,9"
                      stroke="var(--aero-primary-accent)"
                      strokeWidth="2"
                      fill="none"
                      filter="drop-shadow(0 0 4px rgba(255, 140, 0, 0.5))" />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
    </div>
  );
};

// Prediction Detail Screen Component
const PredictionDetail = ({ event }) => {
  const [betStatus, setBetStatus] = useState(null); // 'success', 'error', or null
  const [userPoints, setUserPoints] = useState(0);
  const [isEventActive, setIsEventActive] = useState(true);

  // Load user points from localStorage
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUserPoints(userData.points || 0);
    
    // Check if event is still active
    const now = new Date();
    const endTime = new Date(event.end_time);
    setIsEventActive(now < endTime && event.status === 'active');
  }, [event]);

  const canPlaceBet = () => {
    return isEventActive && userPoints >= event.entry_fee;
  };

  const getErrorMessage = () => {
    if (!isEventActive) {
      return 'This event has ended. No more bets can be placed.';
    }
    if (event.entry_fee > userPoints) {
      return `Insufficient points. You need ${event.entry_fee - userPoints} more points.`;
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
      if (typeof event.entry_fee !== 'number' || event.entry_fee < 100) {
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
        { prediction }, // Don't send amount - it's determined by the event
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
            amount: event.entry_fee,
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
        userData.points = userData.points - event.entry_fee;
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
    <div className="card">
      <div className="card-body">
        <h2 className="event-title">{event.title}</h2>
        
        {/* Price Display */}
        <div className="price-display">
          <div className="price-column">
            <div className="price-label">Current Price</div>
            <div className="price-value">${event.current_price?.toLocaleString() || 'N/A'}</div>
          </div>
          <div className="price-column">
            <div className="price-label">Initial Price</div>
            <div className="price-value">${event.initial_price?.toLocaleString() || 'N/A'}</div>
          </div>
        </div>
        
        {/* Chart Visualization */}
        <div className="chart-container">
          <svg className="chart" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d="M0,30 L20,25 L40,35 L60,20 L80,25 L100,15"
                  stroke="var(--aero-primary-accent)"
                  strokeWidth="3"
                  fill="none"
                  filter="url(#glow)" />
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>
        </div>
        
        {/* Metadata Bar */}
        <div className="metadata-bar">
          <div className="metadata-item">
            <span className="icon">🎫</span>
            <span className="hidden sm:inline">Entry: </span>{typeof event.entry_fee === 'number' ? event.entry_fee : 'N/A'}
          </div>
          <div className="metadata-item">
            <span className="icon">💰</span>
            Pot: ${event.prize_pool?.toLocaleString() || 0}
          </div>
        </div>
        
        {/* User Balance Information */}
        <div className="user-info-display">
          Your Balance: {userPoints.toLocaleString()} points /
          <span className={userPoints >= event.entry_fee ? '' : 'insufficient-points'}>
            Entry: {typeof event.entry_fee === 'number' ? event.entry_fee : 'N/A'} points
          </span>
        </div>
        
        {/* Prediction Buttons */}
        <div className="prediction-buttons-container">
          <button
            className="prediction-button higher"
            onClick={() => handleBet('Higher')}
            disabled={!canPlaceBet() || betStatus === 'success'}
          >
            <span className="arrow-icon">↑</span>
            Higher
          </button>
          <button
            className="prediction-button lower"
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
        
        {/* Resolution Status */}
        {event.status === 'resolved' && (
          <div className="resolution-info">
            <strong>Result:</strong> {event.correct_answer} -
            Final Price: ${event.final_price?.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

// Event List Component
const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const endpoint = activeTab === 'active'
          ? '/api/events/active'
          : '/api/events/history';
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`);
        setEvents(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError('Failed to load events');
        setLoading(false);
      }
    };

    fetchEvents();
  }, [activeTab]);

  if (loading) return <div className="loading">Loading events...</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div className="events-container">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Events
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Prediction History
        </button>
      </div>
      <div className="events-list">
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

// Updated Predictions Interface
const PredictionsInterface = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/active`);
        console.log('PredictionsInterface fetched events:', response.data);
        // Log the first event to see its structure
        if (response.data && response.data.length > 0) {
          console.log('First event structure in PredictionsInterface:', response.data[0]);
        }
        setEvents(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError('Failed to load events');
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <div className="loading">Loading events...</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div className="events-container">
      <div className="flex items-center justify-between mb-6">
        <h2>Active Events</h2>
        <FeeDisplay fee={100} />
      </div>
      <div className="events-list">
        {events.filter(isEventActive).map(event => (
          <div
            key={event.id}
            className="card"
            onClick={() => setSelectedEvent(event)}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-header">
              <div className="event-header">
                <h3 className="event-title">{event.title}</h3>
                <div className="event-meta">
                  <div className="event-info">
                    <span className="participants">👥 {event.current_participants} participants</span>
                    <span className="status-dot status-active"></span>
                  </div>
                  <CountdownTimer endTime={event.end_time} />
                </div>
              </div>
            </div>
            <div className="card-body">
              <p className="description">{event.description}</p>
              <div className="event-details">
                <div className="detail">
                  <span className="icon">💰</span>
                  Pot: ${event.prize_pool?.toLocaleString() || 0}
                </div>
                <div className="detail">
                  <span className="icon">🎫</span>
                  Entry Fee: {typeof event.entry_fee === 'number' ? event.entry_fee : 'N/A'} points
                </div>
              </div>
              <div className="sparkline-container">
                <svg className="sparkline" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,15 L10,12 L20,14 L30,10 L40,12 L50,8 L60,10 L70,6 L80,8 L90,7 L100,9"
                        stroke="var(--aero-primary-accent)"
                        strokeWidth="2"
                        fill="none"
                        filter="drop-shadow(0 0 4px rgba(255, 140, 0, 0.5))" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prediction Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="close-btn" onClick={() => setSelectedEvent(null)} aria-label="Close modal">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <FeeDisplay fee={selectedEvent.entry_fee} variant="success" />
                <PredictionDetail event={selectedEvent} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;