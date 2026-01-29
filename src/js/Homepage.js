import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'react-toastify';
import Navbar from './Navbar';
import Login from './Login';
import '../css/Homepage.css';
import CookiePolicy from '../js/CookiePolicy'; 

export default function Homepage() {
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginKey, setLoginKey] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const openLogin = () => {
    setLoginKey(prev => prev + 1);
    setIsLoginOpen(true);
  };

  const handleFindMatchClick = () => {
    if (currentUser) {
      // User is logged in, redirect to dashboard
      navigate('/dashboard');
    } else {
      // User is not logged in, show login popup with message
      toast.info('Please login first to find your matches!');
      openLogin();
    }
  };

  if (authChecking) {
    return (
      <div className="homepage-loading">
        <img src="/images/logo.png" alt="Loading" className="loading-logo" />
      </div>
    );
  }

  return (
    <div className="homepage">
      <Navbar onLoginClick={openLogin} currentUser={currentUser} />
      {isLoginOpen && (
        <Login
          key={loginKey}     
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
        />
      )}

      <main className="main-content">
        <div className="left-section">
          <h1 className="main-heading">
            <span className="heading-part1">For everyone looking for <br />love </span>
            <span className="heading-part2">especially NRIs</span>
          </h1>
          <p className="subheading">
          Join thousands who have found their<br />
          perfect match with us
          </p>

          <button className="cta-btn" onClick={handleFindMatchClick}>
            Find Your match
          </button>

          {/* <div className="trustpilot">
            <div className="trustpilot-logo">
              <span className="star-icon">★</span>
              <span className="trustpilot-text">Trustpilot</span>
            </div>
            <div className="trustpilot-rating">
              <span className="stars">★★★★★</span>
              <span className="rating-text">4900+ 5 Stars</span>
            </div>
          </div> */}
        </div>

        <div className="right-section">
          <div className="hero-image">
            <img
              src="/images/homepage.png"
              alt="Happy couple"
            />

            {/* <div className="stats-badge">
              <div className="stats-icon">
                <img src="/images/profile_badge.png" alt="Profile Badge" />
              </div>
              <div className="stats-content">
                <div className="stats-growth">+3.50%</div>
                <div className="stats-number">20,590</div>
                <div className="stats-label">Verified Profiles</div>
              </div>
            </div> */}
          </div>
        </div>
      </main>

      {/* Footer - Standard Work Process */}
      <footer className="homepage-footer">
        <h2 className="footer-title">We always follow the standard work process</h2>
        <p className="footer-subtitle">We solve clients' projects in a simple & efficient way</p>
        
        <div className="process-steps">
          <div className="process-step">
            <div className="step-number">1</div>
            <h3 className="step-heading">Create Your Profile</h3>
            <p className="step-description">Tell us about yourself, your values, and what you`re looking for in a life partner.</p>
          </div>
          
          <div className="step-arrow">
            <img src="/images/arrow.png" alt="Arrow" />
          </div>
          
          <div className="process-step">
            <div className="step-number">2</div>
            <h3 className="step-heading">Smart Matchmaking</h3>
            <p className="step-description">Our intelligent system finds matches based on compatibility, preferences, and goals.</p>
          </div>
          
          <div className="step-arrow">
            <img src="/images/arrow.png" alt="Arrow" />
          </div>
          
          <div className="process-step">
            <div className="step-number">3</div>
            <h3 className="step-heading">Connect & Communicate</h3>
            <p className="step-description">Start meaningful conversations in a safe, secure, and respectful environment.</p>
          </div>
          
          <div className="step-arrow">
            <img src="/images/arrow.png" alt="Arrow" />
          </div>
          
          <div className="process-step">
            <div className="step-number">4</div>
            <h3 className="step-heading">Meet Your Match</h3>
            <p className="step-description">Take the next step toward a beautiful relationship and a lasting future together.</p>
          </div>
        </div>
      </footer>

      {/* Footer Navigation */}
      <div className="footer-separator"></div>
      <footer className="homepage-bottom-footer">
        <div className="footer-top-section">
          <div className="footer-logo-section">
            <img src="/images/logo.png" alt="Ybe" className="footer-ybe-logo" />
            <h1 className="footer-main-heading">
                  {/* <span className="heading-part1">Where Majority of<br />NRIs </span>
                  <span className="heading-part2">date and marry</span> */}
                  <span className="heading-part1">For everyone looking for <br />love </span>
                  <span className="heading-part2">especially NRIs</span>

                </h1>
                
          </div>
          <div className="footer-app-buttons">
            <a href="https://play.google.com/store/apps/details?id=com.ube.social&hl=en" target="_blank" rel="noopener noreferrer">
              <img src="/images/appstore.webp" alt="Download on App Store" className="footer-store-btn" />
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.ube.social&hl=en" target="_blank" rel="noopener noreferrer">
              <img src="/images/playstore.webp" alt="Get it on Google Play" className="footer-store-btn" />
            </a>
          </div>
        </div>
        
        <div className="footer-separator"></div>
        
        <div className="footer-bottom-content">
          
          <div className="footer-copyright">
            © Copyright 2026, All Rights Reserved
          </div>
        </div>
        
        <div className="footer-bottom-border"></div>
      </footer>
      <CookiePolicy />
    </div>
  );
}