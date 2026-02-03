// ProtectedRoute.js - Create this new file in your components folder
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { isMandatoryComplete, isAllowedRouteWhenIncomplete, MANDATORY_INCOMPLETE_MESSAGE } from '../utils/mandatoryFields';

// Protected Route - Only accessible when logged in; redirect to profile if mandatory fields incomplete
export function ProtectedRoute({ children }) {
  const location = useLocation();
  const pathname = location.pathname || '';
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.email) {
      setUserData(null);
      return;
    }
    let cancelled = false;
    setUserDataLoading(true);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', user.email));
    getDocs(q)
      .then((snapshot) => {
        if (cancelled) return;
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setUserData({ id: doc.id, ...doc.data() });
        } else {
          setUserData(null);
        }
      })
      .catch(() => {
        if (!cancelled) setUserData(null);
      })
      .finally(() => {
        if (!cancelled) setUserDataLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.email]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}>
        <img src="/images/logo.png" alt="Loading..." style={{ width: '100px' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const allowedWhenIncomplete = isAllowedRouteWhenIncomplete(pathname);
  const mandatoryComplete = userData ? isMandatoryComplete(userData) : true;

  if (!userDataLoading && userData && !mandatoryComplete && !allowedWhenIncomplete) {
    toast.error(MANDATORY_INCOMPLETE_MESSAGE, {
      position: 'top-right',
      autoClose: 5000,
    });
    return <Navigate to="/profile" replace />;
  }

  return children;
}

// Public Route - Only accessible when NOT logged in
export function PublicRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <img src="/images/logo.png" alt="Loading..." style={{ width: '100px' }} />
      </div>
    );
  }

  // If logged in, redirect to profile setup (avoid dashboard redirect)
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}