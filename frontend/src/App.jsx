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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );

    const handleAuthentication = (userData) => {

      console.log('handleAuthentication called with:', userData);

      setUsername(userData.username);

      setPoints(userData.points);

      setIsAdmin(userData.is_admin || false);

      console.log('Username, points, and admin status updated in state');

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

        setIsAdmin(userData.is_admin || false);

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

      

      window.addEventListener('pointsUpdated', handlePointsUpdate);

  

      const handleClickOutside = (event) => {

        if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {

          setShowUserMenu(false);

        }

      };

  

      document.addEventListener('mousedown', handleClickOutside);

      

      // Cleanup the listeners when the component is unmounted

      return () => {

          if (window.ethereum) {

              window.ethereum.removeListener('accountsChanged', handleAccountsChanged);

          }

          window.removeEventListener('pointsUpdated', handlePointsUpdate);

          document.removeEventListener('mousedown', handleClickOutside);

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
            </div>
            {/* --- User Status Display --- */}
            <div className="user-status" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)'
            }}>
            {username ? (
              <div className="user-dropdown" style={{ position: 'relative' }} ref={userMenuRef}>
                <button 
                  className="button button-icon" 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--off-white)'
                  }}
                >
                  <UserIcon />
                </button>
                {showUserMenu && (
                  <div className="dropdown-menu" style={{
                    position: 'absolute',
                    top: 'calc(100% + var(--spacing-sm))',
                    right: 0,
                    background: 'var(--dark-charcoal)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid var(--ui-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-sm)',
                    minWidth: '220px',
                    boxShadow: 'var(--shadow-elevated)',
                    zIndex: 110,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-xs)'
                  }}>
                    <div className="dropdown-header" style={{
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      borderBottom: '1px solid var(--ui-border)',
                    }}>
                      <span style={{ fontWeight: '600', display: 'block' }}>Hello, {username}!</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--light-gray)' }}>{points} Points</span>
                    </div>
                    <Link to="/profile" className="dropdown-item" onClick={() => setShowUserMenu(false)}>Profile</Link>
                    {isAdmin && <Link to="/admin" className="dropdown-item" onClick={() => setShowUserMenu(false)}>Admin Dashboard</Link>}
                    <button
                      className="dropdown-item"
                      onClick={async () => {
                        try {
                          const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/user/claim-free-points`, {}, {
                            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
                          });
                          setPoints(response.data.newTotal);
                          // Show success toast
                        } catch (error) {
                          console.error('Claim failed:', error);
                          // Show error toast
                        }
                        setShowUserMenu(false);
                      }}
                    >
                      Claim Free Points
                    </button>
                    <div style={{ borderTop: '1px solid var(--ui-border)', margin: 'var(--spacing-xs) 0' }}></div>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('user');
                        setUsername('');
                        setPoints(0);
                        setIsAdmin(false);
                        setShowUserMenu(false);
                        // Show success toast
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
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