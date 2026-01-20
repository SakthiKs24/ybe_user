// ProtectedRoute.js - Create this new file in your components folder
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Protected Route - Only accessible when logged in
export function ProtectedRoute({ children }) {
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

  // If not logged in, redirect to homepage
  if (!user) {
    return <Navigate to="/" replace />;
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
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
}