import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    location: 'Newyork, USA',
    interestedIn: 'Women',
    sortBy: 'High Match',
    distance: [0, 15],
    age: [20, 38],
    maritalStatus: {
      neverMarried: false,
      divorced: false,
      widowed: false
    }
  });

  // Fetch current user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
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
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch all users excluding current user and blocked users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userData?.uid) return;
      
      try {
        const usersRef = collection(db, 'users');
        let userQuery;
        
        // Build query based on gender preference and profileDiscovery
        const genderPreference = filters.interestedIn;
        
        if (genderPreference === 'Men') {
          userQuery = query(
            usersRef,
            where('profileDiscovery', '==', true),
            where('userGender', '==', 'male')
          );
        } else if (genderPreference === 'Women') {
          userQuery = query(
            usersRef,
            where('profileDiscovery', '==', true),
            where('userGender', '==', 'female')
          );
        } else {
          // Both - only filter by profileDiscovery
          userQuery = query(
            usersRef,
            where('profileDiscovery', '==', true)
          );
        }
        
        const querySnapshot = await getDocs(userQuery);
        
        // Map snapshot to users, exclude current user
        const users = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== userData.uid) {
            users.push({
              id: doc.id,
              userId: doc.id,
              ...doc.data()
            });
          }
        });
        
        // Collect all user IDs to check blocks
        const userIds = users.map((user) => user.userId || user.id);
        
        // Fetch block documents in chunks of 30 (Firestore limit)
        const userBlockMap = {};
        
        for (let i = 0; i < userIds.length; i += 30) {
          const chunk = userIds.slice(
            i,
            i + 30 > userIds.length ? userIds.length : i + 30
          );
          
          if (chunk.length === 0) continue;
          
          const blockQuery = query(
            collection(db, 'block'),
            where(documentId(), 'in', chunk)
          );
          
          const blockSnapshot = await getDocs(blockQuery);
          
          blockSnapshot.forEach((doc) => {
            const data = doc.data();
            const blockedBy = data.blockedBy || [];
            userBlockMap[doc.id] = Array.isArray(blockedBy) ? blockedBy : [];
          });
        }
        
        // Filter users based on block status
        const filteredUsers = users.filter((user) => {
          const userId = user.userId || user.id;
          const blockedBy = userBlockMap[userId] || [];
          return !blockedBy.includes(userData.uid);
        });
        
        setAllUsers(filteredUsers);
        setFilteredUsers(filteredUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      }
    };

    fetchUsers();
  }, [userData?.uid, filters.interestedIn]);

  // Apply filters
  useEffect(() => {
    let filtered = [...allUsers];

    // Note: Gender filter is already applied in fetchUsers based on filters.interestedIn

    // Filter by age
    filtered = filtered.filter(user => {
      if (!user.age) return false;
      const age = parseInt(user.age) || 0;
      return age >= filters.age[0] && age <= filters.age[1];
    });

    // Filter by marital status
    if (filters.maritalStatus.neverMarried || filters.maritalStatus.divorced || filters.maritalStatus.widowed) {
      filtered = filtered.filter(user => {
        const status = user.status?.toLowerCase() || '';
        return (
          (filters.maritalStatus.neverMarried && (status === 'single' || status === 'never married')) ||
          (filters.maritalStatus.divorced && status === 'divorced') ||
          (filters.maritalStatus.widowed && status === 'widowed')
        );
      });
    }

    // Sort by
    if (filters.sortBy === 'High Match') {
      // Sort by match score (you can implement match algorithm later)
      filtered.sort((a, b) => {
        // Placeholder: sort by name for now
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (filters.sortBy === 'Online') {
      // Sort by online status (you can add online status field later)
      filtered.sort((a, b) => {
        return (b.online || false) - (a.online || false);
      });
    }

    setFilteredUsers(filtered);
  }, [filters, allUsers]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleCheckboxChange = (category, key) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully!', {
        position: "top-right",
        autoClose: 2000,
      });
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatHeight = (height) => {
    if (!height) return '';
    const [ft, inch] = height.split('.');
    return `${ft}'${inch}"`;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <img src="/images/logo.png" alt="Ybe Logo" className="loading-logo" />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Ybe Logo" className="header-logo" />
          <nav className="header-nav">
            <a href="#" className="nav-link active">Matches</a>
            <a href="/chat" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/chat'); }}>Messages</a>
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
          <button className="icon-btn" onClick={() => setShowLogoutModal(true)}>
            <img src="/images/profile.png" alt="Profile" className="profile-icon-img" />
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Left Sidebar - Filters */}
        <aside className="filters-sidebar">
          <h2 className="sidebar-title">New matches</h2>
          
          <div className="filter-section">
            <label className="filter-label">Location</label>
            <select 
              className="filter-select"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            >
              <option>Newyork, USA</option>
              <option>Bengaluru, Karnataka</option>
              <option>Mumbai, Maharashtra</option>
              <option>Delhi, India</option>
            </select>
          </div>

          <div className="filter-section">
            <label className="filter-label">Interested in</label>
            <div className="radio-group">
              {['Women', 'Men', 'Both'].map(option => (
                <label key={option} className="radio-label">
                  <input
                    type="radio"
                    name="interestedIn"
                    value={option}
                    checked={filters.interestedIn === option}
                    onChange={(e) => handleFilterChange('interestedIn', e.target.value)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Sort By</label>
            <div className="radio-group">
              {['Online', 'offline', 'High Match'].map(option => (
                <label key={option} className="radio-label">
                  <input
                    type="radio"
                    name="sortBy"
                    value={option}
                    checked={filters.sortBy === option}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Distance</label>
            <div className="slider-container">
              <div className="slider-labels">
                <span>0 km</span>
                <span>5 km</span>
                <span>10 km</span>
                <span>15 km</span>
                <span>20 km</span>
                <span>25 km</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                value={filters.distance[1]}
                onChange={(e) => handleFilterChange('distance', [0, parseInt(e.target.value)])}
                className="slider"
              />
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Age</label>
            <div className="slider-container">
              <div className="slider-labels">
                <span>20</span>
                <span>30</span>
                <span>40</span>
                <span>50</span>
                <span>60</span>
              </div>
              <div className="range-inputs">
                <input
                  type="range"
                  min="20"
                  max="60"
                  value={filters.age[0]}
                  onChange={(e) => handleFilterChange('age', [parseInt(e.target.value), filters.age[1]])}
                  className="slider"
                />
                <input
                  type="range"
                  min="20"
                  max="60"
                  value={filters.age[1]}
                  onChange={(e) => handleFilterChange('age', [filters.age[0], parseInt(e.target.value)])}
                  className="slider"
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">MARITAL STATUS</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.maritalStatus.neverMarried}
                  onChange={() => handleCheckboxChange('maritalStatus', 'neverMarried')}
                />
                <span>Never Married</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.maritalStatus.divorced}
                  onChange={() => handleCheckboxChange('maritalStatus', 'divorced')}
                />
                <span>Divorced</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.maritalStatus.widowed}
                  onChange={() => handleCheckboxChange('maritalStatus', 'widowed')}
                />
                <span>Widowed</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Main Content - Match Cards */}
        <main className="matches-content">
          <h2 className="matches-title">New matches who match your preferences</h2>
          
          <div className="matches-grid">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const age = user.age || calculateAge(user.birthDate) || 'N/A';
                const height = formatHeight(user.height);
                const profileImage = user.profileImageUrls?.[0] || '/images/profile_badge.png';
                
                return (
                  <div key={user.id} className="match-card">
                    <div className="match-card-header">
                      <div className="profile-image-container">
                        <img src={profileImage} alt={user.name || 'User'} className="profile-image" />
                        {user.vip && <span className="vip-badge">vip</span>}
                      </div>
                      <button className="favorite-btn">♡</button>
                    </div>
                    
                    <div className="match-card-body">
                      <div className="match-name-row">
                        <h3 className="match-name">{user.name || 'Anonymous'}</h3>
                        {user.verified && <span className="verified-badge">✓</span>}
                      </div>
                      <div className="online-status">Online now</div>
                      
                      <div className="match-details">
                        <div className="detail-column">
                          <div className="detail-item">
                            {age} yrs, {height}
                          </div>
                          <div className="detail-item">
                            {user.religion || 'N/A'},{user.caste || 'Caste'}
                          </div>
                          <div className="detail-item">
                            {user.motherTongue || 'N/A'}
                          </div>
                        </div>
                        <div className="detail-column">
                          <div className="detail-item">
                            {user.status === 'single' ? 'Never Married' : user.status || 'N/A'}
                          </div>
                          <div className="detail-item">
                            {user.settledCountry || 'N/A'},{user.settledState || 'N/A'}
                          </div>
                          <div className="detail-item">
                            {user.dayJob || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="match-bio">
                        {user.aboutMe ? (
                          <>
                            {user.aboutMe.substring(0, 100)}
                            {user.aboutMe.length > 100 && <span className="more-link"> more</span>}
                          </>
                        ) : (
                          'No bio available'
                        )}
                      </div>
                    </div>
                    
                    <div className="match-card-actions">
                      <button className="action-btn reject-btn">✕</button>
                      <button className="action-btn like-btn">❤</button>
                      <button className="action-btn superlike-btn">⭐</button>
                      <button className="action-btn message-btn">💬</button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-matches">
                <p>No matches found. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </main>
      </div>

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
    </div>
  );
}
