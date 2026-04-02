// ProtectedRoute.js - Create this new file in your components folder
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, getDocsFromServer, query, where } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { isMandatoryComplete, isAllowedRouteWhenIncomplete, getMandatoryIncompleteMessage } from '../utils/mandatoryFields';

// Protected Route - Only accessible when logged in; redirect to profile if mandatory fields incomplete
export function ProtectedRoute({ children }) {
  const location = useLocation();
  const pathname = location.pathname || '';
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(false);

  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const countPhotos = (urls) =>
    (urls || []).filter((url) => url && String(url).trim()).length;

  const pickPreferredUserDoc = (docs, normalizedEmail) => {
    if (!docs || docs.length === 0) return null;
    return [...docs].sort((a, b) => {
      const aData = a.data() || {};
      const bData = b.data() || {};

      const aHasUserId = !!aData.userId;
      const bHasUserId = !!bData.userId;
      if (aHasUserId !== bHasUserId) return aHasUserId ? -1 : 1;

      const aEmailMatch = normalizedEmail && (aData.email || '').toLowerCase() === normalizedEmail;
      const bEmailMatch = normalizedEmail && (bData.email || '').toLowerCase() === normalizedEmail;
      if (aEmailMatch !== bEmailMatch) return aEmailMatch ? -1 : 1;

      const aPhotos = countPhotos(aData.profileImageUrls);
      const bPhotos = countPhotos(bData.profileImageUrls);
      if (aPhotos !== bPhotos) return bPhotos - aPhotos;

      const aUpdated = toMillis(aData.updatedAt || aData.createdAt);
      const bUpdated = toMillis(bData.updatedAt || bData.createdAt);
      return bUpdated - aUpdated;
    })[0];
  };

  const fetchDocsFresh = async (q) => {
    try {
      return await getDocsFromServer(q);
    } catch (serverError) {
      return await getDocs(q);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid && !user?.email) {
      setUserData(null);
      return;
    }
    let cancelled = false;
    setUserDataLoading(true);
    const usersRef = collection(db, 'users');
    const normalizedEmail = user.email?.trim().toLowerCase();

    fetchDocsFresh(query(usersRef, where('authUid', '==', user.uid)))
      .then(async (snapshot) => {
        if (cancelled) return null;
        if (!snapshot.empty) return snapshot;
        if (!normalizedEmail) return null;
        return fetchDocsFresh(query(usersRef, where('email', '==', normalizedEmail)));
      })
      .then((snapshot) => {
        if (cancelled) return;
        if (snapshot && !snapshot.empty) {
          const doc = pickPreferredUserDoc(snapshot.docs, normalizedEmail) || snapshot.docs[0];
          setUserData({ id: doc.id, ...doc.data() });
          return;
        }
        setUserData(null);
      })
      .catch(() => {
        if (!cancelled) setUserData(null);
      })
      .finally(() => {
        if (!cancelled) setUserDataLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.uid, user?.email]);

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

  const fromProfileSetup = location.state?.fromProfileSetup === true;
  if (!userDataLoading && userData && !mandatoryComplete && !allowedWhenIncomplete && !fromProfileSetup) {
    toast.error(getMandatoryIncompleteMessage(userData), {
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
  const socialAuthFlowInProgress = sessionStorage.getItem('socialAuthFlowInProgress') === 'true';

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
  if (user && !socialAuthFlowInProgress) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
