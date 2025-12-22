import React, { useState } from 'react';
import Navbar from './Navbar';
import Login from './Login';
import '../css/Homepage.css';

export default function Homepage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="homepage">
      <Navbar onLoginClick={() => setIsLoginOpen(true)} />
      <Login isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <main className="main-content">
        <div className="left-section">
          <h1 className="main-heading">
            Where Majority of<br />
            NRIs <span className="highlight">date and marry</span>
          </h1>
          <p className="subheading">
            Join thousands of people finding their<br />
            soulmate through our trusted platform
          </p>
          
          <button className="cta-btn">
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

            <div className="stats-badge">
              <div className="stats-icon">
                <img src="/images/profile_badge.png" alt="Profile Badge" />
              </div>
              <div className="stats-content">
                <div className="stats-growth">+3.50%</div>
                <div className="stats-number">20,590</div>
                <div className="stats-label">Verified Profiles</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}