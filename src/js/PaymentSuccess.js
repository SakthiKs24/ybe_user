import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { verifyPaymentSession } from './services/stripeService';
import { toast } from 'react-toastify';
import '../css/PaymentScreen.css';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [progress, setProgress] = useState(0);
  const sessionId = searchParams.get('session_id');
  const hasVerified = useRef(false); // Prevent duplicate verification

  useEffect(() => {
    // Prevent duplicate calls in React StrictMode
    if (hasVerified.current) return;
    
    const verifyPayment = async () => {
      hasVerified.current = true;
      if (!sessionId) {
        toast.error('Invalid payment session');
        navigate('/upgrade');
        return;
      }

      try {
        // Verify payment with Stripe
        const session = await verifyPaymentSession(sessionId);
        
        if (session.payment_status === 'paid') {
          // Update user subscription in Firebase
          const user = auth.currentUser;
          if (user) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0];
              const userDocRef = doc(db, 'users', userDoc.id);
              
              // Plan validity map matching Flutter model
              const planValidityMap = {
                'Ybe Plus': 30,
                'Ybe Premium': 90,
                'Ybe Gold': 180,
              };
              
              // Map plan name to subscription constant (exact match from Flutter)
              const planNameFromMetadata = session.metadata?.planName || '';
              let planSubscribed = '';
              
              // Map plan names to constants (exact match)
              if (planNameFromMetadata === 'Ybe Plus' || planNameFromMetadata.toLowerCase().includes('plus')) {
                planSubscribed = 'Ybe Plus';
              } else if (planNameFromMetadata === 'Ybe Premium' || planNameFromMetadata.toLowerCase().includes('premium')) {
                planSubscribed = 'Ybe Premium';
              } else if (planNameFromMetadata === 'Ybe Gold' || planNameFromMetadata.toLowerCase().includes('gold')) {
                planSubscribed = 'Ybe Gold';
              } else {
                // Default to plus if unknown
                planSubscribed = 'Ybe Plus';
              }
              
              // Get validity days
              const validityDays = planValidityMap[planSubscribed] || 30;
              
              // Calculate validUntil date (matching Flutter getPlanValidity logic)
              const getPlanValidity = (daysToAdd) => {
                const now = new Date();
                const futureDate = new Date(now);
                futureDate.setDate(futureDate.getDate() + daysToAdd);
                
                const year = futureDate.getFullYear();
                const month = String(futureDate.getMonth() + 1).padStart(2, '0');
                const day = String(futureDate.getDate()).padStart(2, '0');
                
                return `${year}-${month}-${day}`;
              };
              
              const validUntil = getPlanValidity(validityDays);
              
              // Save subscription fields (matching Flutter model)
              await updateDoc(userDocRef, {
                subscriptions: {
                  planName: planSubscribed,
                  validUntil: validUntil,
                  availedBoost: 0,
                  boostedUntil: null,
                },
              });

              toast.success('Subscription activated successfully!');
              setLoading(false);
            }
          }
        } else {
          throw new Error('Payment not completed');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        toast.error('Failed to verify payment. Please contact support.');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, navigate]);

  // Auto-redirect countdown after payment is verified
  useEffect(() => {
    if (!loading && countdown > 0) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            navigate('/upgrade');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Update progress bar (20% per second)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 20;
        });
      }, 1000);
      
      return () => {
        clearInterval(interval);
        clearInterval(progressInterval);
      };
    }
  }, [loading, countdown, navigate]);

  return (
    <div className="payment-screen">
      <div className="payment-container payment-success">
        {loading ? (
          <>
            <div className="loading">Verifying your payment...</div>
          </>
        ) : (
          <>
            <div className="success-icon">✓</div>
            <h2>Payment Successful!</h2>
            <p>Your subscription has been activated.</p>
            <p className="redirect-message">Redirecting in {countdown} seconds...</p>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <button onClick={() => navigate('/upgrade')} className="btn-primary">
              Go to Upgrade Page
            </button>
          </>
        )}
      </div>
    </div>
  );
}

