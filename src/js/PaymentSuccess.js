import React, { useEffect, useState } from 'react';
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
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
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
              
              const plan = {
                name: session.metadata?.planName || 'Unknown',
                type: session.metadata?.planType || 'plus',
                cost: session.amount_total / 100,
                validityDays: parseInt(session.metadata?.validityDays) || 30,
              };
              
              const validityDays = plan.validityDays;
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + validityDays);

              await updateDoc(userDocRef, {
                subscriptions: {
                  planName: plan.name,
                  planType: plan.type,
                  cost: plan.cost,
                  validityDays: validityDays,
                  startDate: new Date().toISOString(),
                  expiryDate: expiryDate.toISOString(),
                  sessionId: sessionId,
                  status: 'active',
                },
              });

              toast.success('Subscription activated successfully!');
            }
          }
        } else {
          throw new Error('Payment not completed');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        toast.error('Failed to verify payment. Please contact support.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, navigate]);

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
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

