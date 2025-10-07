import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './index.css';
import './basic-styles.css';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';

// Main App Component
const App = () => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [points, setPoints] = useState(0);
  const [username, setUsername] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
    <Router>
      <div className="app-container main-container">
        <nav className="main-nav">
          <div className="nav-links">
            <Link to="/events" className="nav-link">Events</Link>
          </div>
          {/* --- User Status Display --- */}
          <div className="user-status">
            {username ? (
              <div className="user-info flex flex-col sm:flex-row items-center gap-4">
                <span className="username text-primary-700 font-medium">Hello, {username}!</span>
                <div className="points-display flex flex-col sm:flex-row gap-2">
                  <div className="points-balance text-sm sm:text-base bg-primary-50 px-3 py-1 rounded-full">
                    🪙 <span className="points-amount font-medium text-primary-700">{points}</span> Points
                  </div>
                  <button
                    className="button button-success bg-success-600 hover:bg-success-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm hover:shadow"
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
                        toast.className = 'toast toast-success show bg-success-500 text-white';
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
                        toast.className = 'toast toast-error show bg-danger-500 text-white';
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
                  className="button button-secondary bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors duration-200"
                  onClick={() => {
                    // Clear authentication data
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');
                    setUsername('');
                    setPoints(0);
                    
                    // Show success toast
                    const toast = document.createElement('div');
                    toast.className = 'toast toast-success show bg-success-500 text-white';
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
              <div className="auth-buttons flex gap-2">
                <button
                  className="button button-secondary bg-secondary-100 hover:bg-secondary-200 text-secondary-700 font-medium px-4 py-2 rounded-lg transition-colors duration-200"
                  onClick={() => setShowRegisterModal(true)}
                >
                  Register
                </button>
                <button
                  className="button button-primary bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm hover:shadow"
                  onClick={() => setShowLoginModal(true)}
                >
                  Login
                </button>
              </div>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/events" element={<EventList />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/" element={<EventList />} />
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
  );
};

export default App;