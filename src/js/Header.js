import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const Header = ({ userData, showProfileDropdown = false, setShowProfileDropdown = () => {}, dropdownRef = null, currentPage = '' }) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      if (userData && userData.uid) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', auth.currentUser?.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userDocRef = doc(db, 'users', userDoc.id);
            await updateDoc(userDocRef, {
              onlineStatus: false
            });
          }
        } catch (error) {
          console.error('Error updating onlineStatus:', error);
        }
      }

      await signOut(auth);
      // Clear localStorage to prevent auth state restoration
      localStorage.removeItem('userDetails');
      toast.success('Logged out successfully!');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  // Check if this is a public page (privacy policy without user data)
  const isPublicPage = currentPage === 'privacy' && !userData;

  return (
    <>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Ybe Logo" className="header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
          {!isPublicPage && (
            <nav className="header-nav">
              <a href="#" className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Matches</a>
              <a href="/chat" className={`nav-link ${currentPage === 'chat' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigate('/chat'); }}>Messages</a>
            </nav>
          )}
        </div>
        <div className="header-right">
          {!isPublicPage && (
            <button className="upgrade-btn" onClick={() => navigate('/upgrade')}>Upgrade now</button>
          )}
          {userData ? (
            <>
              <button 
                className="icon-btn profile-icon-btn" 
                onClick={() => navigate('/profile')}
                title="Profile"
              >
                <img 
                  src={userData.profileImageUrls?.[0] || "/images/profile.png"} 
                  alt="Profile" 
                  className="profile-icon-img" 
                />
              </button>
              <button 
                className="icon-btn logout-icon-btn" 
                onClick={() => setShowLogoutModal(true)}
                title="Logout"
              >
                <img src="/images/logout.jpeg" alt="Logout" className="logout-icon-img" />
              </button>
            </>
          ) : !isPublicPage && (
            <>
              <button className="icon-btn profile-icon-btn" onClick={() => navigate('/')}>
                <img src="/images/profile.png" alt="Profile" className="profile-icon-img" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}> 
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="modal-buttons">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
                className="btn-confirm"
              >
                Yes, Sure
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;