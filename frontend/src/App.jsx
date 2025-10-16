import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminRoute from './components/admin/AdminRoute';
import './index.css';
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

  // Handle authentication updates from login/register forms
  const handleAuthentication = (userData) => {
    console.log('handleAuthentication called with:', userData);
    setUsername(userData.username);
    setPoints(userData.points);
    console.log('Username and points updated in state');
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

  // Create particle effects
  useEffect(() => {
    const particlesContainer = document.getElementById('particles-container');
    if (!particlesContainer) return;

    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Random position
      const posX = Math.random() * 100;
      const posY = Math.random() * 100;
      particle.style.left = `${posX}%`;
      particle.style.top = `${posY}%`;
      
      // Random size
      const size = Math.random() * 3 + 1;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Random animation duration
      const duration = Math.random() * 10 + 10;
      particle.style.animationDuration = `${duration}s`;
      
      // Random delay
      const delay = Math.random() * 5;
      particle.style.animationDelay = `${delay}s`;
      
      particlesContainer.appendChild(particle);
      
      // Remove particle after animation completes
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, duration * 1000);
    };

    // Create initial particles
    for (let i = 0; i < 20; i++) {
      setTimeout(createParticle, i * 300);
    }

    // Create particles periodically
    const particleInterval = setInterval(createParticle, 500);

    // Clean up
    return () => {
      clearInterval(particleInterval);
    };
  }, []);

  return (
    <Router>
      <div className="app-container main-container">
        <nav className="main-nav" style={{
          background: 'var(--ui-surface)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--ui-border)',
          padding: 'var(--spacing-md) var(--spacing-xl)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div className="nav-container" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%'
          }}>
            <div className="nav-links" style={{
              display: 'flex',
              gap: 'var(--spacing-xl)',
              alignItems: 'center'
            }}>
              <Link to="/events" className="nav-link" style={{
                color: 'var(--off-white)',
                textDecoration: 'none',
                fontWeight: '500',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-sm)',
                transition: 'all var(--transition-medium)'
              }}>Events</Link>
              {username && (
                <Link to="/profile" className="nav-link" style={{
                  color: 'var(--off-white)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all var(--transition-medium)'
                }}>Profile</Link>
              )}
            </div>
            {/* --- User Status Display --- */}
            <div className="user-status" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)'
            }}>
            {username ? (
              <div className="user-info" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-lg)',
                flexWrap: 'wrap'
              }}>
                <span className="username" style={{
                  color: 'var(--off-white)',
                  fontWeight: '500',
                  whiteSpace: 'nowrap'
                }}>Hello, {username}!</span>
                <div className="points-display" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-md)',
                  flexWrap: 'wrap'
                }}>
                  <div className="points-balance" style={{
                    fontSize: '0.875rem',
                    backgroundColor: 'rgba(255, 140, 0, 0.1)',
                    padding: 'var(--spacing-xs) var(--spacing-md)',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap',
                    color: 'var(--orange-primary)',
                    border: '1px solid rgba(255, 140, 0, 0.3)'
                  }}>
                    🪙 <span style={{ fontWeight: '600' }}>{points}</span> Points
                  </div>
                  <button
                    className="button button-success"
                    style={{
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap'
                    }}
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
                <div className="user-dropdown" style={{ position: 'relative' }}>
                  <button className="button button-secondary" style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap'
                  }}>
                    Menu ▼
                  </button>
                  <div className="dropdown-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    background: 'var(--ui-surface)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid var(--ui-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--spacing-sm)',
                    marginTop: 'var(--spacing-xs)',
                    minWidth: '150px',
                    boxShadow: 'var(--shadow-elevated)',
                    display: 'none'
                  }}>
                    <Link to="/profile" className="dropdown-item" style={{
                      display: 'block',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      color: 'var(--off-white)',
                      textDecoration: 'none',
                      borderRadius: 'var(--radius-xs)',
                      transition: 'background var(--transition-fast)'
                    }}>Profile</Link>
                    <Link to="/admin" className="dropdown-item" style={{
                      display: 'block',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      color: 'var(--off-white)',
                      textDecoration: 'none',
                      borderRadius: 'var(--radius-xs)',
                      transition: 'background var(--transition-fast)'
                    }}>Admin Dashboard</Link>
                    <button
                      className="dropdown-item"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        color: 'var(--off-white)',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-xs)',
                        transition: 'background var(--transition-fast)',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
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
                </div>
              </div>
            ) : (
              <div className="auth-buttons" style={{
                display: 'flex',
                gap: 'var(--spacing-sm)'
              }}>
                <button
                  className="button button-secondary"
                  onClick={() => setShowRegisterModal(true)}
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    fontSize: '0.875rem'
                  }}
                >
                  Register
                </button>
                <button
                  className="button button-primary"
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    fontSize: '0.875rem'
                  }}
                >
                  Login
                </button>
              </div>
            )}
          </div>
          </div>
        </nav>

        <style>{`
          .nav-link:hover {
            background: rgba(255, 140, 0, 0.1);
            color: var(--orange-primary);
          }
          
          .user-dropdown:hover .dropdown-menu {
            display: block;
          }
          
          .dropdown-item:hover {
            background: rgba(255, 140, 0, 0.1);
          }
        `}</style>

        <Routes>
          <Route path="/events" element={<EventList />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/" element={<EventList />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      
      {showRegisterModal && (
        <RegisterForm onClose={() => setShowRegisterModal(false)} onAuthentication={handleAuthentication} />
      )}
      {showLoginModal && (
        <LoginForm onClose={() => setShowLoginModal(false)} onAuthentication={handleAuthentication} />
      )}
      
      {/* Particle effect container */}
      <div className="particles" id="particles-container"></div>
    </Router>
  );
};

export default App;