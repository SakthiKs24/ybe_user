import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/FavoriteCategory.css';

export default function FavoriteCategory() {
  const navigate = useNavigate();
  const { category } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [categoryUsers, setCategoryUsers] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const dropdownRef = useRef(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = categoryUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(categoryUsers.length / usersPerPage);

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
        }
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!userData?.uid) return;
      
      try {
        const favoritesRef = collection(db, 'favorites');
        const q = query(favoritesRef, where('likedBy', '==', userData.userId));
        const querySnapshot = await getDocs(q);
        const favSet = new Set();
        querySnapshot.forEach((doc) => {
          favSet.add(doc.data().likedUser);
        });
        
        setFavorites(favSet);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };

    fetchFavorites();
  }, [userData?.uid]);

  // Fetch category users
  useEffect(() => {
    const fetchCategoryUsers = async () => {
      if (!userData?.uid || !category) return;
      
      try {
        // Fetch favorites
        const favoritesRef = collection(db, 'favorites');
        const q = query(favoritesRef, where('likedBy', '==', userData.userId));
        const favSnapshot = await getDocs(q);
        
        const favoriteUserIds = [];
        favSnapshot.forEach((doc) => {
          favoriteUserIds.push(doc.data().likedUser);
        });

        if (favoriteUserIds.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch user details for favorites
        const usersRef = collection(db, 'users');
        const allFavoriteUsers = [];
        
        for (let i = 0; i < favoriteUserIds.length; i += 30) {
          const chunk = favoriteUserIds.slice(i, Math.min(i + 30, favoriteUserIds.length));
          const usersSnapshot = await getDocs(usersRef);
          
          usersSnapshot.forEach((doc) => {
            if (chunk.includes(doc.id)) {
              allFavoriteUsers.push({
                id: doc.id,
                userId: doc.id,
                ...doc.data()
              });
            }
          });
        }

        // Filter based on category
        let filtered = [];
        
        switch(category) {
          case 'liked':
            filtered = allFavoriteUsers;
            break;
            
          case 'beingLiked':
            const likedByQuery = query(favoritesRef, where('likedUser', '==', userData.userId));
            const likedBySnapshot = await getDocs(likedByQuery);
            const likedByIds = new Set();
            likedBySnapshot.forEach((doc) => {
              likedByIds.add(doc.data().likedBy);
            });
            filtered = allFavoriteUsers.filter(user => likedByIds.has(user.userId));
            break;
            
          case 'samePassions':
            filtered = allFavoriteUsers.filter(user => {
              if (user.passions && userData.passions) {
                const commonPassions = user.passions.filter(p => userData.passions.includes(p));
                return commonPassions.length > 0;
              }
              return false;
            });
            break;
            
          case 'sameInterests':
            filtered = allFavoriteUsers.filter(user => {
              if (user.interests && userData.interests) {
                const commonInterests = user.interests.filter(i => userData.interests.includes(i));
                return commonInterests.length > 0;
              }
              return false;
            });
            break;
            
          case 'sameProfession':
            filtered = allFavoriteUsers.filter(user => 
              user.dayJob && userData.dayJob && user.dayJob === userData.dayJob
            );
            break;
            
          case 'sameCity':
            filtered = allFavoriteUsers.filter(user => 
              user.currentPosition?.city && userData.currentPosition?.city && 
              user.currentPosition.city === userData.currentPosition.city
            );
            break;
            
          case 'sameCountry':
            filtered = allFavoriteUsers.filter(user => 
              user.settledCountry && userData.settledCountry && 
              user.settledCountry === userData.settledCountry
            );
            break;
            
          case 'sameEducation':
            filtered = allFavoriteUsers.filter(user => 
              user.education && userData.education && user.education === userData.education
            );
            break;
            
          case 'sameReligion':
            filtered = allFavoriteUsers.filter(user => 
              user.religion && userData.religion && user.religion === userData.religion
            );
            break;
            
          case 'sameNativeCountry':
            filtered = allFavoriteUsers.filter(user => 
              user.nativeCountry && userData.nativeCountry && 
              user.nativeCountry === userData.nativeCountry
            );
            break;
            
          case 'sameMotherTongue':
            filtered = allFavoriteUsers.filter(user => 
              user.motherTongue && userData.motherTongue && 
              user.motherTongue === userData.motherTongue
            );
            break;
            
          case 'sameStar':
            filtered = allFavoriteUsers.filter(user => 
              user.star && userData.star && user.star === userData.star
            );
            break;
            
          case 'shortlisted':
            const shortlistRef = collection(db, 'shortlist');
            const shortlistQuery = query(shortlistRef, where('shortlistedBy', '==', userData.userId));
            const shortlistSnapshot = await getDocs(shortlistQuery);
            const shortlistedIds = new Set();
            shortlistSnapshot.forEach((doc) => {
              shortlistedIds.add(doc.data().shortlistedUser);
            });
            filtered = allFavoriteUsers.filter(user => shortlistedIds.has(user.userId));
            break;
            
          default:
            filtered = allFavoriteUsers;
        }

        setCategoryUsers(filtered);
      } catch (error) {
        console.error('Error fetching category users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryUsers();
  }, [userData?.uid, category]);

  const handleFavoriteToggle = async (e, userId) => {
    e.stopPropagation();
    
    if (!userData?.uid) return;
    
    try {
      const isFavorite = favorites.has(userId);
      
      if (isFavorite) {
        const favoritesRef = collection(db, 'favorites');
        const q = query(
          favoritesRef, 
          where('likedBy', '==', userData.userId),
          where('likedUser', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, 'favorites', docSnapshot.id));
        });
        
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(userId);
          return newFavorites;
        });
        
        toast.success('Removed from favorites');
      } else {
        await addDoc(collection(db, 'favorites'), {
          likedBy: userData.userId,
          likedUser: userId,
        });

        setFavorites(prev => new Set(prev).add(userId));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
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
      toast.success('Logged out successfully!');
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

  const handleProfileClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleChatClick = (e, userId) => {
    e.stopPropagation();
    navigate(`/chat/${userId}`);
  };

  const getCategoryTitle = () => {
    const titles = {
      liked: 'Liked',
      beingLiked: 'Being Liked',
      samePassions: 'Same Passions',
      sameInterests: 'Same Interests',
      sameProfession: 'Same Profession',
      sameCity: 'Same City',
      sameCountry: 'Same Country',
      sameEducation: 'Same Level Education',
      sameReligion: 'Same Religion',
      sameNativeCountry: 'Same Native Country',
      sameMotherTongue: 'Same Mother Tongue',
      sameStar: 'Same Star',
      shortlisted: 'Shortlisted'
    };
    return titles[category] || 'Favorites';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <img src="/images/logo.png" alt="Ybe Logo" className="loading-logo" />
      </div>
    );
  }

  return (
    <div className="favorite-category-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Ybe Logo" className="header-logo" />
          <nav className="header-nav">
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Matches</a>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/chat'); }}>Messages</a>
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

      {/* Main Content */}
      <main className="category-matches-content">
        <div className="category-header">
          <button className="back-btn" onClick={() => navigate('/favorites')}>
            ← Back to Favorites
          </button>
          <h2 className="category-title">
            {getCategoryTitle()} ({categoryUsers.length})
          </h2>
          <div className="pagination-info">
            Showing {categoryUsers.length > 0 ? indexOfFirstUser + 1 : 0}-{Math.min(indexOfLastUser, categoryUsers.length)} of {categoryUsers.length}
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
              
              const isFavorited = favorites.has(user.userId || user.id);
              
              return (
                <div key={user.id} className="match-card">
                  <div className="match-card-content">
                    <div 
                      className="match-card-left"
                      onClick={() => handleProfileClick(user.userId || user.id)}
                      style={{ cursor: 'pointer' }}
                    >
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

                    <div className="match-card-middle">
                      <div className="match-name-row">
                        <h3 
                          className="match-name"
                          onClick={() => handleProfileClick(user.userId || user.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          {user.name || 'Anonymous'}
                        </h3>
                        {isVerified && <span className="verified-badge">✓</span>}
                        {isOnline && (
                          <div className="online-status-indicator">
                            <span className="online-icon">💬</span>
                            <span className="online-text">Online now</span>
                          </div>
                        )}
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

                    <div className="match-card-actions">
                      <button className="action-btn reject-btn" title="Reject">
                        <img src="/images/Reject.png" alt="Reject" className="action-icon" />
                      </button>
                      <button 
                        className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
                        onClick={(e) => handleFavoriteToggle(e, user.userId || user.id)}
                        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorited ? '❤️' : '♡'}
                      </button>
                      <button className="action-btn" title="Like">
                        <img src="/images/Like.png" alt="Like" className="action-icon" />
                      </button>
                      <button className="action-btn super" title="Super Like">
                        <img src="/images/Star.png" alt="Super Like" className="action-icon" />
                      </button>
                      <button 
                        className="action-btn" 
                        onClick={(e) => handleChatClick(e, user.userId || user.id)}
                        title="Message">
                        <img src="/images/Chat.png" alt="Message" className="action-icon" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-matches">
              <p>No users found in this category.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {categoryUsers.length > usersPerPage && (
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
      </main>

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