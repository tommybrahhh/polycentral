import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './index.css';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';

// Main App Component
const App = () => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [points, setPoints] = useState(0);
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
  
  // This runs our function when the page loads.
  // It also sets up a listener for account changes.
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

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    
    // Cleanup the listener when the component is unmounted
    return () => {
        if (window.ethereum) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
    };
  }, []);

  return (
    <Router>
      <div className="app-container">
        <nav className="main-nav">
          <Link to="/events" className="nav-link">Events</Link>
          <Link to="/predictions" className="nav-link">Predictions</Link>
          {/* --- User Status Display --- */}
          <div className="user-status">
            {username ? (
              <div className="user-info">
                <span className="username">Hello, {username}!</span>
                <div className="points-display">
                  <div className="points-balance">
                    🪙 <span className="points-amount">{points}</span> Points
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
          <Route path="/predictions" element={<PredictionsInterface />} />
          <Route path="/" element={<EventsInterface />} />
        </Routes>
      </div>
      
      {showRegisterModal && (
        <RegisterForm onClose={() => setShowRegisterModal(false)} />
      )}
      {showLoginModal && (
        <LoginForm onClose={() => setShowLoginModal(false)} />
      )}
    </Router>
  );
};

// Events Interface Component (No changes needed here)
const EventsInterface = () => {
  const [events, setEvents] = React.useState([]);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newEvent, setNewEvent] = React.useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    capacity: 100
  });

  React.useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      // IMPORTANT: You might need to provide the full URL in development
      // e.g., axios.get('http://localhost:3001/api/events')
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/active`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/events`, newEvent);
      setShowCreateModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
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
        {events.map(event => (
          <div key={event.id} className="card">
            <div className="card-header">
              <div className="event-header">
                <h3>{event.title}</h3>
                <span className="participants">👥 {event.current_participants} participants</span>
              </div>
            </div>
            <div className="card-body">
              <p className="description">{event.description}</p>
              <div className="event-details">
                <div className="detail">
                  <span className="icon">⏰</span>
                  Ends at: {new Date(event.end_time).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Event Card Component
const EventCard = ({ event }) => {
const [timeRemaining, setTimeRemaining] = useState(event.time_remaining);
const [isExpired, setIsExpired] = useState(timeRemaining <= 0);
const [betStatus, setBetStatus] = useState(null); // 'success', 'error', or null
const [betAmount, setBetAmount] = useState(250); // Default minimum bet
const [userPoints, setUserPoints] = useState(0);

// Load user points from localStorage
useEffect(() => {
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  setUserPoints(userData.points || 0);
}, []);

// Handle bet amount changes
const handleBetAmountChange = (increment) => {
  const newAmount = increment ? betAmount + 100 : betAmount - 100;
  // Ensure minimum bet of 250 and don't exceed user's points
  if (newAmount >= 250 && newAmount <= userPoints) {
    setBetAmount(newAmount);
  }
};

// Validate if user has enough points for the bet
const canPlaceBet = () => {
  return userPoints >= betAmount;
};

// Get error message if user doesn't have enough points
const getErrorMessage = () => {
  if (betAmount > userPoints) {
    return `Insufficient points. You need ${betAmount - userPoints} more points.`;
  }
  return '';
};

useEffect(() => {
  if (isExpired) return;
  
  const timer = setInterval(() => {
    setTimeRemaining(prev => {
      if (prev <= 1) {
        clearInterval(timer);
        setIsExpired(true);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [isExpired]);

const formatTime = (seconds) => {
  if (seconds <= 0) return 'Expired';
  
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

const getTimePercentage = (totalTime, currentTime) => {
  return Math.max(0, Math.min(100, ((totalTime - currentTime) / totalTime) * 100));
};

// Update handleBet function to use selected bet amount
const handleBet = async (prediction) => {
  try {
    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('User not authenticated');
    
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
      { prediction, amount: betAmount },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    setBetStatus('success');
    
    // Update user points after successful bet
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    userData.points = userData.points - betAmount;
    localStorage.setItem('user', JSON.stringify(userData));
    setUserPoints(userData.points);
    
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
    toast.textContent = 'Failed to place bet. Try again.';
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
    
    setTimeout(() => setBetStatus(null), 3000);
  }
};

  // Calculate total time for countdown percentage
  const totalTime = event.end_time ? (new Date(event.end_time) - new Date(event.start_time)) / 1000 : 86400; // Default 24 hours
  const currentTime = timeRemaining;
  const timePercentage = getTimePercentage(totalTime, currentTime);

  return (
    <div className="card">
      <div className="card-header">
        <div className="event-header">
          <h3>{event.title}</h3>
          <div className="event-meta">
            <div className="event-cost-info">
              <span className="entry-fee">🎫 Min. Entry: 250 points</span>
              <span className="prize-pool">💰 Pot: ${event.prize_pool?.toLocaleString() || 0}</span>
            </div>
            <div className="time-remaining-container">
              <span className="time-remaining">
                {isExpired ? '⏱️ Expired' : `⏱️ ${formatTime(timeRemaining)}`}
              </span>
              <div className="countdown-progress">
                <div
                  className="countdown-progress-bar"
                  style={{ width: `${timePercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="card-body">
        <p className="description">{event.description}</p>
        
        {/* Display current cryptocurrency price */}
        {event.initial_price && (
          <div className="price-display">
            <div className="current-price">
              ${event.initial_price.toLocaleString()}
            </div>
            <div className="price-change">
              {event.price_change === 'up' ? (
                <span className="price-up">↑</span>
              ) : event.price_change === 'down' ? (
                <span className="price-down">↓</span>
              ) : (
                <span className="price-neutral">→</span>
              )}
            </div>
          </div>
        )}
        
        <div className="bet-options">
          <div className="bet-amount-selector">
            <button
              className="button button-secondary"
              onClick={() => handleBetAmountChange(false)}
              disabled={betAmount <= 250}
            >
              -
            </button>
            <span className="bet-amount">
              {betAmount.toLocaleString()} points
            </span>
            <button
              className="button button-secondary"
              onClick={() => handleBetAmountChange(true)}
              disabled={!canPlaceBet(betAmount + 100)}
            >
              +
            </button>
          </div>
          <div className="user-points-info">
            You have {userPoints.toLocaleString()} points
            {getErrorMessage() && <div className="form-error">{getErrorMessage()}</div>}
          </div>
          <button
            className="button button-success"
            onClick={() => handleBet('Higher')}
            disabled={isExpired || betStatus === 'success' || !canPlaceBet()}
          >
            <span className="bet-icon">📈</span>
            Higher
          </button>
          <button
            className="button button-error"
            onClick={() => handleBet('Lower')}
            disabled={isExpired || betStatus === 'success' || !canPlaceBet()}
          >
            <span className="bet-icon">📉</span>
            Lower
          </button>
        </div>
        
        {betStatus === 'success' && (
          <div className="form-success">Bet placed successfully!</div>
        )}
        {betStatus === 'error' && (
          <div className="form-error">Failed to place bet. Try again.</div>
        )}
        
        {/* Display resolution status */}
        {event.status === 'resolved' && (
          <div className="resolution-info">
            <strong>Result:</strong> {event.correct_answer} -
            Final Price: ${event.final_price?.toLocaleString()}
          </div>
        )}
        
        {/* Claim button for daily free participation */}
        {event.is_daily && !event.participated && (
          <button
            className="button button-success"
            onClick={async () => {
              try {
                const token = localStorage.getItem('auth_token');
                if (!token) throw new Error('User not authenticated');
                
                const response = await axios.post(
                  `${import.meta.env.VITE_API_BASE_URL}/api/events/${event.id}/bet`,
                  { prediction: 'Higher' }, // Default prediction for free participation
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                
                // Update event to show participation
                event.participated = true;
                setEvents([...events]);
                setBetStatus('success');
                setTimeout(() => setBetStatus(null), 3000);
              } catch (error) {
                console.error('Claim failed:', error);
                setBetStatus('error');
                setTimeout(() => setBetStatus(null), 3000);
              }
            }}
          >
            🎁 Claim Free Participation
          </button>
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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/active`);
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
      <h2>Active Events</h2>
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
  return <EventList />;
};

export default App;