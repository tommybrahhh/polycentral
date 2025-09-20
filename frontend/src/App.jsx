import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './style.css';
import RegisterForm from './RegisterForm';

// Main App Component
const App = () => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [points, setPoints] = useState(0);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showTestButton, setShowTestButton] = useState(true); // Show test button for development

  // Function to create a test event
  const createTestEvent = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please log in first');
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/events/test`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        alert('Test event created successfully!');
        // Refresh events
        fetchEvents();
      }
    } catch (error) {
      console.error('Error creating test event:', error);
      alert('Failed to create test event: ' + (error.response?.data?.error || error.message));
    }
  };

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
          <button 
            className="nav-link"
            onClick={() => setShowRegisterModal(true)}
          >
            Register
          </button>
          
          {/* --- Wallet Button Logic --- */}
         <div className="wallet-container">
           {!currentAccount ? (
             <button onClick={connectWallet} className="wallet-btn">
               Connect Wallet
             </button>
           ) : (
             <p className="wallet-address">
               Connected: {`${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}`}
             </p>
           )}
           
           {/* Test Button for Development */}
           {showTestButton && (
             <button
               onClick={createTestEvent}
               className="test-btn"
               style={{
                 backgroundColor: '#ff6b6b',
                 color: 'white',
                 padding: '8px 15px',
                 border: 'none',
                 borderRadius: '5px',
                 cursor: 'pointer',
                 marginLeft: '10px',
                 fontWeight: 'bold'
               }}
             >
               🧪 Create Test Event
             </button>
           )}
            <div className="points-display">
              🪙 {points} Points
              <button
                className="claim-btn"
                onClick={async () => {
                  try {
                    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/user/claim-free-points`, {}, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    setPoints(p => p + response.data.points);
                  } catch (error) {
                    console.error('Claim failed:', error);
                    alert('Failed to claim points: ' + (error.response?.data?.message || error.message));
                  }
                }}
                title="Claim daily points"
              >
                + Claim
              </button>
            </div>
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
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tournaments/active`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tournaments`, newEvent);
      setShowCreateModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  return (
    <div className="events-container">
      <div className="header">
        <h2>Manage Events</h2>
        <button onClick={() => setShowCreateModal(true)} className="create-btn">
          + New Event
        </button>
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Event</h3>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label>Event Title</label>
                <input
                  type="text"
                  required
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  required
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="datetime-local"
                    required
                    onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={newEvent.capacity}
                  onChange={(e) => setNewEvent({...newEvent, capacity: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="events-list">
        {events.map(event => (
          <div key={event.id} className="event-card">
            <div className="event-header">
              <h3>{event.title}</h3>
              <span className="participants">👥 {event.current_participants} participants</span>
            </div>
            <p className="description">{event.description}</p>
            <div className="event-details">
              <div className="detail">
                <span className="icon">⏰</span>
                Ends at: {new Date(event.end_time).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Tournament Card Component
const TournamentCard = ({ tournament }) => {
  const [timeRemaining, setTimeRemaining] = useState(tournament.time_remaining);
  const [isExpired, setIsExpired] = useState(timeRemaining <= 0);
  const [betStatus, setBetStatus] = useState(null); // 'success', 'error', or null

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
    
    return `${days}d ${hours}h ${minutes}m ${secs}s remaining`;
  };

  const handleBet = async (prediction) => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('User not authenticated');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/tournaments/${tournament.id}/bet`,
        { prediction },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setBetStatus('success');
      setTimeout(() => setBetStatus(null), 3000);
    } catch (error) {
      console.error('Betting failed:', error);
      setBetStatus('error');
      setTimeout(() => setBetStatus(null), 3000);
    }
  };

  return (
    <div className="tournament-card">
      <div className="tournament-header">
        <h3>{tournament.title}</h3>
        <div className="tournament-meta">
          <span className="entry-fee">🎫 ${tournament.entry_fee}</span>
          <span className="time-remaining">
            {isExpired ? '⏱️ Expired' : `⏱️ ${formatTime(timeRemaining)}`}
          </span>
        </div>
      </div>
      <p className="description">{tournament.description}</p>
      
      {/* Display initial Bitcoin price */}
      {tournament.initial_price && (
        <div className="price-info">
          <strong>Starting Price:</strong> ${tournament.initial_price.toLocaleString()}
        </div>
      )}
      
      <div className="bet-options">
        <button
          className="bet-btn yes"
          onClick={() => handleBet('Higher')}
          disabled={isExpired || betStatus === 'success'}
        >
          Higher
        </button>
        <button
          className="bet-btn no"
          onClick={() => handleBet('Lower')}
          disabled={isExpired || betStatus === 'success'}
        >
          Lower
        </button>
      </div>
      
      {betStatus === 'success' && (
        <div className="bet-status success">Bet placed successfully!</div>
      )}
      {betStatus === 'error' && (
        <div className="bet-status error">Failed to place bet. Try again.</div>
      )}
      
      {/* Display resolution status */}
      {tournament.status === 'resolved' && (
        <div className="resolution-info">
          <strong>Result:</strong> {tournament.correct_answer} -
          Final Price: ${tournament.final_price?.toLocaleString()}
        </div>
      )}
    </div>
  );
};

// Tournament List Component
const TournamentList = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tournaments/active`);
        setTournaments(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch tournaments:', err);
        setError('Failed to load tournaments');
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  if (loading) return <div className="loading">Loading tournaments...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="tournaments-container">
      <h2>Active Tournaments</h2>
      <div className="tournaments-list">
        {tournaments.map(tournament => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
    </div>
  );
};

// Updated Predictions Interface
const PredictionsInterface = () => {
  return <TournamentList />;
};

export default App;
/**
 * Test Event Button
 * 
 * Purpose: This button is for development and testing purposes only.
 * It allows immediate creation of a prediction event without waiting
 * for the daily midnight UTC trigger.
 * 
 * Why it exists: 
 * - Enables immediate testing of the event lifecycle
 * - Helps verify frontend display and countdown functionality
 * - Allows testing without waiting 24 hours for natural event cycle
 * 
 * Production note: This button should be hidden or removed in production
 * as events are automatically created daily at midnight UTC.
 */