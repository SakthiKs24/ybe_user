import React, { useState, useEffect } from 'react';

const CookiePolicy = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
      padding: '20px',
      zIndex: 9999,
      borderTop: '1px solid #e0e0e0'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#333'
          }}>
            🍪 Cookie Policy
          </h3>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.5'
          }}>
            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
            By clicking "Accept All", you consent to our use of cookies. 
            <a href="/privacy-policy" style={{
              color: '#FF027D',
              textDecoration: 'none',
              marginLeft: '4px',
              fontWeight: '500'
            }}>
              Learn more
            </a>
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleDecline}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '500',
              border: '1px solid #ddd',
              backgroundColor: '#fff',
              color: '#333',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#fff';
            }}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              backgroundColor: '#FF027D',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#E00270';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#FF027D';
            }}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;