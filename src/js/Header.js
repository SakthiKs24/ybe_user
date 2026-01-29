import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc, onSnapshot, orderBy, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const Header = ({ userData, showProfileDropdown = false, setShowProfileDropdown = () => {}, dropdownRef = null, currentPage = '' }) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationDropdownRef = useRef(null);

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

  // Fetch notifications
  useEffect(() => {
    if (!userData?.userId) {
      setUnreadNotificationCount(0);
      setNotifications([]);
      return;
    }

    try {
      const notificationRef = collection(db, 'notification', userData.userId, 'notification');
      // Fetch all notifications ordered by timestamp (newest first)
      const q = query(notificationRef, orderBy('timestamp', 'desc'));
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        let count = 0;
        const notificationsList = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          // Count notifications where isRead is not true (false, null, or undefined)
          if (data.isRead !== true) {
            count++;
          }
          
          // Fetch user data for profile image
          let profileImage = '/images/profile.png';
          let userName = 'User';
          if (data.userId || data.senderId) {
            try {
              const userId = data.userId || data.senderId;
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                profileImage = userData.profileImageUrls?.[0] || '/images/profile.png';
                userName = userData.name || 'User';
              }
            } catch (err) {
              console.error('Error fetching user data:', err);
            }
          }
          
          notificationsList.push({
            id: docSnap.id,
            ...data,
            profileImage,
            userName
          });
        }
        
        setUnreadNotificationCount(count);
        setNotifications(notificationsList);
      }, (error) => {
        console.error('Error fetching notifications:', error);
        setUnreadNotificationCount(0);
        setNotifications([]);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up notification listener:', error);
      setUnreadNotificationCount(0);
      setNotifications([]);
    }
  }, [userData?.userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        // Check if click is not on the notification button
        if (!event.target.closest('.notification-icon-btn')) {
          setShowNotificationDropdown(false);
        }
      }
    };

    if (showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationDropdown]);

  // Group notifications by date
  const groupNotificationsByDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayNotifications = [];
    const yesterdayNotifications = [];
    const olderNotifications = [];

    notifications.forEach(notification => {
      let notificationDate = null;
      if (notification.timestamp) {
        notificationDate = notification.timestamp.toDate ? notification.timestamp.toDate() : new Date(notification.timestamp);
      } else if (notification.createdAt) {
        notificationDate = notification.createdAt.toDate ? notification.createdAt.toDate() : new Date(notification.createdAt);
      } else {
        notificationDate = new Date();
      }

      const notifDate = new Date(notificationDate);
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        todayNotifications.push(notification);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        yesterdayNotifications.push(notification);
      } else {
        olderNotifications.push(notification);
      }
    });

    return { todayNotifications, yesterdayNotifications, olderNotifications };
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    if (!userData?.userId) return;

    try {
      const notificationDocRef = doc(db, 'notification', userData.userId, 'notification', notificationId);
      await updateDoc(notificationDocRef, {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (notification.isRead !== true) {
      await markNotificationAsRead(notification.id);
    }
    
    // You can add navigation logic here based on notification type
    // For example, navigate to profile or chat
    if (notification.userId || notification.senderId) {
      const userId = notification.userId || notification.senderId;
      navigate(`/profile/${userId}`);
    }
    
    // Close dropdown after clicking
    setShowNotificationDropdown(false);
  };

  // Check if this is a public page (privacy policy without user data)
  const isPublicPage = currentPage === 'privacy' && !userData;

  return (
    <>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Ybe Logo" className="header-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }} />
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
              <div className="notification-wrapper" ref={notificationDropdownRef}>
                <button 
                  className="icon-btn notification-icon-btn" 
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  title="Notifications"
                >
                  <img 
                    src="/images/notification.png" 
                    alt="Notifications" 
                    className="notification-icon" 
                  />
                  {unreadNotificationCount > 0 && (
                    <span className="notification-badge">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>
                  )}
                </button>
                
                {showNotificationDropdown && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <h3 className="notification-dropdown-title">Notifications</h3>
                      <div className="notification-header-icon">
                        <img 
                          src="/images/notification.png" 
                          alt="Notifications" 
                          className="notification-icon-small" 
                        />
                        {unreadNotificationCount > 0 && (
                          <span className="notification-badge-small">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>
                        )}
                      </div>
                    </div>
                    <div className="notification-dropdown-content">
                      {(() => {
                        const { todayNotifications, yesterdayNotifications, olderNotifications } = groupNotificationsByDate();
                        return (
                          <>
                            {todayNotifications.length > 0 && (
                              <div className="notification-section">
                                <h4 className="notification-section-title">Today</h4>
                                {todayNotifications.map(notification => (
                                  <div 
                                    key={notification.id} 
                                    className={`notification-item ${notification.isRead !== true ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                  >
                                    <img 
                                      src={notification.profileImage} 
                                      alt={notification.userName}
                                      className="notification-profile-img"
                                    />
                                    <div className="notification-text">
                                      <p className="notification-message">
                                        {notification.message || notification.text || `${notification.userName} invited you for a match`}
                                      </p>
                                    </div>
                                    <div className="notification-time">
                                      <span className="notification-time-text">{formatTime(notification.timestamp || notification.createdAt)}</span>
                                      <span className="notification-date-text">{formatDate(notification.timestamp || notification.createdAt)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {yesterdayNotifications.length > 0 && (
                              <div className="notification-section">
                                <h4 className="notification-section-title">Yesterday</h4>
                                {yesterdayNotifications.map(notification => (
                                  <div 
                                    key={notification.id} 
                                    className={`notification-item ${notification.isRead !== true ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                  >
                                    <img 
                                      src={notification.profileImage} 
                                      alt={notification.userName}
                                      className="notification-profile-img"
                                    />
                                    <div className="notification-text">
                                      <p className="notification-message">
                                        {notification.message || notification.text || `${notification.userName} invited you for a match`}
                                      </p>
                                    </div>
                                    <div className="notification-time">
                                      <span className="notification-time-text">{formatTime(notification.timestamp || notification.createdAt)}</span>
                                      <span className="notification-date-text">{formatDate(notification.timestamp || notification.createdAt)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {olderNotifications.length > 0 && (
                              <div className="notification-section">
                                <h4 className="notification-section-title">Older</h4>
                                {olderNotifications.map(notification => (
                                  <div 
                                    key={notification.id} 
                                    className={`notification-item ${notification.isRead !== true ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                  >
                                    <img 
                                      src={notification.profileImage} 
                                      alt={notification.userName}
                                      className="notification-profile-img"
                                    />
                                    <div className="notification-text">
                                      <p className="notification-message">
                                        {notification.message || notification.text || `${notification.userName} invited you for a match`}
                                      </p>
                                    </div>
                                    <div className="notification-time">
                                      <span className="notification-time-text">{formatTime(notification.timestamp || notification.createdAt)}</span>
                                      <span className="notification-date-text">{formatDate(notification.timestamp || notification.createdAt)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {notifications.length === 0 && (
                              <div className="notification-empty">
                                <p>No notifications</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
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
              {/* <button 
                className="icon-btn logout-icon-btn" 
                onClick={() => setShowLogoutModal(true)}
                title="Logout"
              >
                <img src="/images/logout.jpeg" alt="Logout" className="logout-icon-img" />
              </button> */}
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