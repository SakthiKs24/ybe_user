import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/PaymentScreen.css';

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="payment-screen">
      <div className="payment-container payment-cancel">
        <div className="cancel-icon">✕</div>
        <h2>Payment Cancelled</h2>
        <p>Your payment was cancelled. No charges were made.</p>
        <div className="payment-actions">
          <button onClick={() => navigate('/upgrade')} className="btn-primary">
            Try Again
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary">
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

