import React from 'react';
import '../css/Navbar.css';

export default function Navbar({ onLoginClick }) {
  const handleSignupClick = () => {
    window.location.href = '/create-account';
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
        <a href="#about">About us</a>
        <a href="#help">Help</a>
        <a href="#login" className="login-link" onClick={(e) => {
          e.preventDefault();
          onLoginClick();
        }}>Login</a>
        <button className="signup-btn" onClick={handleSignupClick}>Signup</button>
      </nav>
    </header>
  );
}