import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Navbar.css';

export default function Navbar({ onLoginClick, currentUser, hideDashboard = false }) {
  const navigate = useNavigate();

  const handleSignupClick = () => {
    navigate('/consent');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handlePrivacyPolicyClick = (e) => {
    e.preventDefault();
    navigate('/privacy-policy');
  };

  return (
    <header className="header">
      <div className="logo">
        <img
          src="/images/logo.png"
          alt="Ibe Logo"
          className="logo-img"
        />
      </div>

      <nav className="nav">
        <a href="/privacy-policy" onClick={handlePrivacyPolicyClick}>
          Privacy Policy
        </a>
        
        {currentUser && !hideDashboard ? (
          // Show Dashboard button if user is logged in
          <button className="signup-btn" onClick={handleDashboardClick}>
            Dashboard
          </button>
        ) : (
          // Show Login and Signup buttons if user is not logged in
          <>
            <a href="#login" className="login-link" onClick={(e) => {
              e.preventDefault();
              onLoginClick();
            }}>
              Login
            </a>
            <button className="signup-btn" onClick={handleSignupClick}>
              Signup
            </button>
          </>
        )}
      </nav>
    </header>
  );
}