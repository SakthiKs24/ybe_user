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
      toast.success('Logged out successfully!');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  return (
    <>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Ybe Logo" className="header-logo" />
          <nav className="header-nav">
            <a href="#" className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Matches</a>
            <a href="/chat" className={`nav-link ${currentPage === 'chat' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigate('/chat'); }}>Messages</a>
          </nav>
        </div>
        <div className="header-center">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search" className="search-input" />
          </div>
        </div>
        <div className="header-right">
          <button className="upgrade-btn" onClick={() => navigate('/upgrade')}>Upgrade now</button>
          {userData ? (
            <div className="profile-dropdown-wrapper" ref={dropdownRef}>
              <button 
                className="icon-btn" 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <img src="/images/profile.png" alt="Profile" className="profile-icon-img" />
              </button>
              
              {showProfileDropdown && (
                <div className="profile-dropdown-menu">
                  <div className="dropdown-item" onClick={() => {
                    setShowProfileDropdown(false);
                    navigate('/profile');
                  }}>
                    <span className="dropdown-icon">👤</span>
                    <span>Profile</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-item logout-item" onClick={() => {
                    setShowProfileDropdown(false);
                    setShowLogoutModal(true);
                  }}>
                    <span className="dropdown-icon">🚪</span>
                    <span>Logout</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="icon-btn" onClick={() => navigate('/profile')}>
              <img src="/images/profile.png" alt="Profile" className="profile-icon-img" />
            </button>
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