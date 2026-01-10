import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Header from './Header';
import '../css/PrivacyPolicy.css';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [privacyContent, setPrivacyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Privacy Policy is a public page - check auth state but don't require it
    // Only fetch user data if user is currently authenticated (for Header display)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Check if userDetails exists in localStorage first (to avoid unnecessary queries)
      const userDetailsStr = localStorage.getItem('userDetails');
      
      if (user && userDetailsStr) {
        // User is authenticated and has cached data - use it
        try {
          const parsed = JSON.parse(userDetailsStr);
          setUserData({
            uid: user.uid,
            email: user.email,
            ...parsed
          });
        } catch (error) {
          console.error('Error parsing userDetails:', error);
          setUserData(null);
        }
      } else if (user) {
        // User is authenticated but no cached data - fetch from Firestore
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setUserData({
              uid: user.uid,
              email: user.email,
              ...userDoc.data()
            });
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        // User is not authenticated - explicitly set userData to null
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      try {
        const docRef = doc(db, 'privacyPolicy', 'content');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const htmlString = docSnap.data().text || '';
          setPrivacyContent(htmlString);
        } else {
          console.log('No privacy policy document found');
          setPrivacyContent('<p>Privacy Policy content not available.</p>');
        }
      } catch (error) {
        console.error('Error fetching privacy policy:', error);
        setPrivacyContent('<p>Error loading privacy policy.</p>');
      } finally {
        setLoading(false);
      }
    };

    fetchPrivacyPolicy();
  }, []);

  if (loading) {
    return (
      <div className="privacy-policy-container">
        <Header userData={userData} currentPage="privacy" />
        <div className="privacy-loading">
          <p>Loading Privacy Policy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="privacy-policy-container">
      <Header userData={userData} currentPage="privacy" />
      <div className="privacy-policy-content">
        <h1 className="privacy-title">Privacy Policy</h1>
        <div 
          className="privacy-content"
          dangerouslySetInnerHTML={{ __html: privacyContent }}
        />
      </div>
    </div>
  );
}

