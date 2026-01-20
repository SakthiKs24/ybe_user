import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/ConsentForm.css';

export default function ConsentForm() {
  const navigate = useNavigate();

  const handleAccept = () => {
    sessionStorage.setItem('consentAccepted', 'true');
    navigate('/create-account');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="consent-page">
      <header className="consent-header">
        <div className="logo">
          <img src="/images/logo.png" alt="Ybe Logo" className="logo-img" />
        </div>
      </header>
      <div className="consent-container">
        <div className="consent-card">
          <button className="consent-back-btn" onClick={handleBack}>←</button>
          <div className="consent-illustration">
            <img src="/images/setup.png" alt="Consent" className="consent-icon" />
          </div>
          <h2 className="consent-title">Consent Form</h2>
          <div className="consent-content">
            <p>
              I affirm that all information, data, and responses I provide are
              true, accurate, and reliable to the best of my knowledge at the
              time of submission.
            </p>
            <p>
              I accept full responsibility for any inaccuracies, misleading
              details, or false information, understanding that they may lead to
              unintended errors or misinterpretation.
            </p>
          </div>
          <button className="consent-accept-btn" onClick={handleAccept}>Accept</button>
        </div>
      </div>
    </div>
  );
}

