import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, documentId, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const dropdownRef = useRef(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  
  // Filter states
  const [filters, setFilters] = useState({
    location: 'All',
    interestedIn: 'Women',
    sortBy: 'High Match',
    age: [20, 60],
    maritalStatus: {
      neverMarried: false,
      divorced: false,
      widowed: false
    }
  });

  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Pagination handlers
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        pageNumbers.push(currentPage - 1);
        pageNumbers.push(currentPage);
        pageNumbers.push(currentPage + 1);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, filteredUsers.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      
      setFilterLoading(true);
      
      try {
        const usersRef = collection(db, 'users');
        let userQuery;
        
        // Build query based on gender preference and profileDiscovery
        const genderPreference = filters.interestedIn;
        
        if (genderPreference === 'Men') {
          userQuery = query(
            usersRef,
            where('profileDiscovery', '==', true),
            where('userGender', '==', 'Male')
          );
        } else if (genderPreference === 'Women') {
          userQuery = query(
            usersRef,
            where('profileDiscovery', '==', true),
            where('userGender', '==', 'Female')
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
        const locationsSet = new Set();
        
        querySnapshot.forEach((doc) => {
          if (doc.id !== userData.uid) {
            const userData = doc.data();
            users.push({
              id: doc.id,
              userId: doc.id,
              ...userData
            });
            
            // Extract unique locations
            if (userData.settledCountry) {
              locationsSet.add(userData.settledCountry);
            }
            // Also check for other location fields
            if (userData.currentPosition?.city) {
              const locationStr = `${userData.currentPosition.city}, ${userData.settledCountry || ''}`.trim();
              locationsSet.add(locationStr);
            }
          }
        });
        
        // Set unique locations for dropdown
        const locationsArray = Array.from(locationsSet).filter(loc => loc && loc.trim() !== '').sort();
        setUniqueLocations(['All', ...locationsArray]);
        
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
      } finally {
        setFilterLoading(false);
      }
    };

    fetchUsers();
  }, [userData?.uid, filters.interestedIn]);

  // Apply filters
  useEffect(() => {
    if (allUsers.length === 0) return;
    
    setFilterLoading(true);
    setFilteredUsers([]); // Clear old data immediately
    
    // Use setTimeout to ensure UI updates with loading state
    const filterTimeout = setTimeout(() => {
      let filtered = [...allUsers];

      // Filter by location
      if (filters.location && filters.location !== 'All') {
        filtered = filtered.filter(user => {
          const userLocation = user.settledCountry || '';
          const userCity = user.currentPosition?.city || '';
          const fullLocation = userCity ? `${userCity}, ${userLocation}` : userLocation;
          
          return userLocation.includes(filters.location) || 
                 fullLocation.includes(filters.location) ||
                 filters.location.includes(userLocation);
        });
      }

      // Filter by age
      filtered = filtered.filter(user => {
        let age;
        if (user.age) {
          age = parseInt(user.age);
        } else if (user.dateOfBirth) {
          age = calculateAge(user.dateOfBirth);
        } else if (user.birthDate) {
          age = calculateAge(user.birthDate);
        } else {
          return false; 
        }
        
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
        filtered.sort((a, b) => {
          return (a.name || '').localeCompare(b.name || '');
        });
      } else if (filters.sortBy === 'Online') {
        filtered.sort((a, b) => {
          return (b.onlineStatus ? 1 : 0) - (a.onlineStatus ? 1 : 0);
        });
      } else if (filters.sortBy === 'offline') {
        filtered.sort((a, b) => {
          return (a.onlineStatus ? 1 : 0) - (b.onlineStatus ? 1 : 0);
        });
      }

      setFilteredUsers(filtered);
      setFilterLoading(false);
    }, 100);

    return () => clearTimeout(filterTimeout);
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
              {uniqueLocations.map((location, index) => (
                <option key={index} value={location}>
                  {location}
                </option>
              ))}
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
            <label className="filter-label">Age</label>
            
            <div className="age-range-display">
              <span className="age-value">{filters.age[0]}</span>
              <span className="age-separator">-</span>
              <span className="age-value">{filters.age[1]}</span>
            </div>
            <div className="slider-labels">
              <span>20</span>
              <span>30</span>
              <span>40</span>
              <span>50</span>
              <span>60</span>
            </div>
            <div className="dual-range-slider">
              <div className="slider-track">
                <div 
                  className="slider-range" 
                  style={{
                    left: `${((filters.age[0] - 20) / 40) * 100}%`,
                    width: `${((filters.age[1] - filters.age[0]) / 40) * 100}%`
                  }}
                ></div>
              </div>
              
              <input
                type="range"
                min="20"
                max="60"
                value={filters.age[0]}
                onChange={(e) => {
                  const newMin = parseInt(e.target.value);
                  if (newMin < filters.age[1]) {
                    handleFilterChange('age', [newMin, filters.age[1]]);
                  }
                }}
                className="slider-thumb slider-thumb-min"
              />
              <input
                type="range"
                min="20"
                max="60"
                value={filters.age[1]}
                onChange={(e) => {
                  const newMax = parseInt(e.target.value);
                  if (newMax > filters.age[0]) {
                    handleFilterChange('age', [filters.age[0], newMax]);
                  }
                }}
                className="slider-thumb slider-thumb-max"
              />
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
          {filterLoading ? (
            <div className="filter-loading-overlay">
              <img src="/images/logo.png" alt="Loading..." className="filter-loading-logo" />
            </div>
          ) : (
            <>
              <div className="matches-header">
                <h2 className="matches-title">
                  New matches who match your preferences ({filteredUsers.length})
                </h2>
                <div className="pagination-info">
                  Showing {filteredUsers.length > 0 ? indexOfFirstUser + 1 : 0}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length}
                </div>
              </div>
              
              <div className="matches-grid">
                {currentUsers.length > 0 ? (
                  currentUsers.map((user) => {
                    const age = user.age || calculateAge(user.dateOfBirth) || 'N/A';
                    const height = user.height || '';
                    const profileImage = user.profileImageUrls?.[0] || '/images/profile_badge.png';
                    
                    const isOnline = user.onlineStatus === true;
                    const isVerified = user.verified || false;
                    const isVip = user.subscriptions?.planName !== 'Free' || false;
                    const maritalStatus = user.status === 'single' ? 'Never Married' : user.status || 'N/A';
                    const location = user.settledCountry && user.currentPosition?.city 
                      ? `${user.currentPosition.city},${user.settledCountry}` 
                      : user.settledCountry || 'N/A';
                    
                    return (
                      <div key={user.id} className="match-card" onClick={() => navigate(`/profile/${user.userId || user.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                        <div className="match-card-content">
                          {/* Profile Image on Left */}
                          <div className="match-card-left">
                            <div className="profile-image-container">
                              <img src={profileImage} alt={user.name || 'User'} className="profile-image" />
                              {isVip && (
                                <div className="vip-badge">
                                  <span className="vip-icon">😊</span>
                                  <span className="vip-text">vip</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Content in Middle */}
                          <div className="match-card-middle">
                            <div className="match-name-row">
                              <h3 className="match-name">{user.name || 'Anonymous'}</h3>
                              {isVerified && <span className="verified-badge">✓</span>}
                              {isOnline && (
                                <div className="online-status-indicator">
                                  <span className="online-icon">💬</span>
                                  <span className="online-text">Online now</span>
                                </div>
                              )}
                              <button className="favorite-btn">♡</button>
                            </div>
                            
                            <div className="match-details">
                              <div className="detail-column">
                                <div className="detail-item">
                                  {age} yrs, {height}
                                </div>
                                <div className="detail-item">
                                  {user.religion || 'N/A'},{user.community || 'Caste'}
                                </div>
                                <div className="detail-item">
                                  {user.motherTongue || 'N/A'}
                                </div>
                              </div>
                              <div className="detail-column">
                                <div className="detail-item">
                                  {maritalStatus}
                                </div>
                                <div className="detail-item">
                                  {location}
                                </div>
                                <div className="detail-item">
                                  {user.dayJob || 'N/A'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="match-bio">
                              {user.aboutMe ? (
                                <>
                                  {user.aboutMe.substring(0, 80)}
                                  {user.aboutMe.length > 80 && <span className="more-link"> more</span>}
                                </>
                              ) : (
                                'No bio available'
                              )}
                            </div>
                          </div>

                          {/* Action Buttons on Right */}
                          <div className="match-card-actions">
                            <button className="action-btn reject-btn" title="Reject">
                              <img src="/images/Reject.png" alt="Reject" className="action-icon" />
                            </button>
                            <button className="action-btn " title="Like">
                              <img src="/images/Like.png" alt="Like" className="action-icon" />
                            </button>
                            <button className="action-btn super" title="Super Like">
                              <img src="/images/Star.png" alt="Super Like" className="action-icon" />
                            </button>
                            <button className="action-btn" title="Message">
                              <img src="/images/Chat.png" alt="Message" className="action-icon" />
                            </button>
                          </div>
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

              {/* Pagination Controls */}
              {filteredUsers.length > usersPerPage && (
                <div className="pagination-container">
                  <button 
                    className="pagination-btn"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </button>
                  
                  <div className="pagination-numbers">
                    {getPageNumbers().map((pageNum, index) => (
                      pageNum === '...' ? (
                        <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                      ) : (
                        <button
                          key={pageNum}
                          className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                    ))}
                  </div>
                  
                  <button 
                    className="pagination-btn"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
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