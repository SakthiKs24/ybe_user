import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, getDoc, query, where, doc, updateDoc, addDoc, deleteDoc, documentId, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';
import Header from './Header';
import SubHeader from './SubHeader';
import Upgrade from './Upgrade';
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [profileViewLimit, setProfileViewLimit] = useState(null);

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

  // Fetch global daily profile view limit from 'users/RegisteredUsers'
  useEffect(() => {
    const fetchDailyLimit = async () => {
      try {
        const cfgRef = doc(db, 'users', 'RegisteredUsers');
        const snap = await getDoc(cfgRef);
        if (snap.exists()) {
          const data = snap.data() || {};
          const limit = data.dailyLimit && typeof data.dailyLimit.profileViewCount === 'number'
            ? data.dailyLimit.profileViewCount
            : null;
          setProfileViewLimit(limit);
        } else {
          setProfileViewLimit(null);
        }
      } catch (e) {
        console.error('Failed to fetch daily limit config', e);
        setProfileViewLimit(null);
      }
    };
    fetchDailyLimit();
  }, []);

  // Fetch category users (matching Flutter logic - using same filtering as Favorites.js)
  useEffect(() => {
    const fetchCategoryUsers = async () => {
      if (!userData?.uid || !category) return;
      
      try {
        setLoading(true);
        let categoryUserIds = [];
        
        // Fetch category-specific user IDs (matching Flutter fetchData logic)
        if (category === 'liked') {
          const likedSnapshot = await getDocs(
            query(collection(db, 'favorites'), where('likedBy', '==', userData.userId))
          );
          categoryUserIds = likedSnapshot.docs.map(doc => doc.data().likedUser);
        } 
        else if (category === 'beingLiked') {
          const beingLikedSnapshot = await getDocs(
            query(collection(db, 'favorites'), where('likedUser', '==', userData.userId))
          );
          categoryUserIds = beingLikedSnapshot.docs.map(doc => doc.data().likedBy);
        }
        else if (category === 'shortlisted') {
          const shortlistSnapshot = await getDocs(
            query(collection(db, 'shortlist'), where('shortlistedBy', '==', userData.userId))
          );
          categoryUserIds = shortlistSnapshot.docs.map(doc => doc.data().shortlistedUser);
        }
        else if (category === 'sameProfession' && userData.dayJob) {
          const professionSnapshot = await getDocs(
            query(collection(db, 'users'), where('dayJob', '==', userData.dayJob))
          );
          categoryUserIds = professionSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
        }
        else if (category === 'sameReligion' && userData.religion) {
          const religionSnapshot = await getDocs(
            query(collection(db, 'users'), where('religion', '==', userData.religion))
          );
          categoryUserIds = religionSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
        }
        else if ((category === 'sameDegree' || category === 'sameEducation') && userData.degree) {
          // sameEducation maps to sameDegree (uses degree field)
          const degreeSnapshot = await getDocs(
            query(collection(db, 'users'), where('degree', '==', userData.degree))
          );
          categoryUserIds = degreeSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
        }
        else if ((category === 'sameOriginCountry' || category === 'sameNativeCountry') && userData.originCountry) {
          // sameNativeCountry maps to sameOriginCountry (uses originCountry field)
          const originCountrySnapshot = await getDocs(
            query(collection(db, 'users'), where('originCountry', '==', userData.originCountry))
          );
          categoryUserIds = originCountrySnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
        }
        else if ((category === 'sameSettledCountry' || category === 'sameCountry') && userData.settledCountry) {
          // sameCountry maps to sameSettledCountry (uses settledCountry field)
          const settledCountrySnapshot = await getDocs(
            query(collection(db, 'users'), where('settledCountry', '==', userData.settledCountry))
          );
          categoryUserIds = settledCountrySnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
        }
        else if (category === 'sameLocation' && userData.currentPosition?.city) {
          const locationSnapshot = await getDocs(
            query(collection(db, 'users'), where('currentPosition.city', '==', userData.currentPosition.city))
          );
          categoryUserIds = locationSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
        }
        else if (category === 'sameMotherTongue' && userData.motherTongue) {
          const motherTongueSnapshot = await getDocs(
            query(collection(db, 'users'), where('motherTongue', '==', userData.motherTongue))
          );
          categoryUserIds = motherTongueSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
        }
        else if (category === 'sameStar' && userData.selectedPersonalityTraitsMap?.starSign) {
          const starSignSnapshot = await getDocs(
            query(collection(db, 'users'), where('selectedPersonalityTraitsMap.starSign', '==', userData.selectedPersonalityTraitsMap.starSign))
          );
          categoryUserIds = starSignSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
        }

        // Now fetch all discoverable users (matching Flutter StreamBuilder)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('profileDiscovery', '==', true));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const allDiscoverableUsers = snapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => ({
              id: doc.id,
              userId: doc.id,
              ...doc.data()
            }));

          // Get discoverable user IDs (matching Flutter: discoverableUsersId)
          const discoverableUserIds = allDiscoverableUsers
            .filter(user => user.profileDiscovery)
            .map(user => user.userId);

          // Filter category IDs to only include discoverable users (matching Flutter: categoryWiseUserId.retainWhere)
          const filteredCategoryUserIds = categoryUserIds.filter(userId => 
            discoverableUserIds.includes(userId)
          );

          // Get user profiles for this category (matching Flutter: currentCategoryUserProfileList)
          let finalUsers = [];
          
          if (category === 'samePassions') {
            // For samePassions, filter from all discoverable users (matching Flutter logic)
            finalUsers = allDiscoverableUsers.filter(user => {
              if (!userData?.selectedPersonalityTraitsMap?.passions?.length) return false;
              const userPassions = user.selectedPersonalityTraitsMap?.passions || [];
              return userPassions.some(passion => 
                userData.selectedPersonalityTraitsMap.passions.includes(passion)
              ) && user.profileDiscovery && discoverableUserIds.includes(user.userId);
            });
          }
          else if (category === 'sameInterests') {
            // For sameInterests, filter from all discoverable users (matching Flutter logic)
            finalUsers = allDiscoverableUsers.filter(user => {
              if (!userData?.selectedLikesInvolvesMap?.interests?.length) return false;
              const userInterests = user.selectedLikesInvolvesMap?.interests || [];
              return userInterests.some(interest => 
                userData.selectedLikesInvolvesMap.interests.includes(interest)
              ) && user.profileDiscovery && discoverableUserIds.includes(user.userId);
            });
          }
          else {
            // For other categories, use the filtered category user IDs (matching Flutter: currentCategoryUserProfileList)
            finalUsers = allDiscoverableUsers.filter(user => 
              user.profileDiscovery && filteredCategoryUserIds.includes(user.userId)
            );
          }

          setCategoryUsers(finalUsers);
          setLoading(false);
        }, (error) => {
          console.error('Error fetching category users:', error);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching category users:', error);
        setLoading(false);
      }
    };

    fetchCategoryUsers();
  }, [userData?.uid, userData?.userId, category]);

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

  const handleProfileClick = async (targetUserId) => {
    try {
      const planName = userData?.subscriptions?.planName || 'Free';
      if (String(planName).toLowerCase() !== 'free') {
        navigate(`/profile/${targetUserId}`);
        return;
      }
      const maxPerDay = typeof profileViewLimit === 'number' ? profileViewLimit : 5;
      if (!userData?.userId) {
        navigate(`/profile/${targetUserId}`);
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const currentDaily = userData.dailyLimit || {};
      const isNewDay = currentDaily.date !== today;
      const usedCount = isNewDay ? 0 : (currentDaily.profileViewCount || 0);
      if (usedCount >= maxPerDay) {
        setShowUpgradeModal(true);
        return;
      }
      // Update daily counter
      const newCount = usedCount + 1;
      const userDocRef = doc(db, 'users', userData.userId);
      await updateDoc(userDocRef, {
        'dailyLimit.date': today,
        'dailyLimit.profileViewCount': newCount,
      });
      // Update local state
      setUserData(prev => ({
        ...prev,
        dailyLimit: {
          ...prev?.dailyLimit,
          date: today,
          profileViewCount: newCount,
          swipeCount: prev?.dailyLimit?.swipeCount || 0
        }
      }));
      navigate(`/profile/${targetUserId}`);
    } catch (e) {
      console.error('Failed enforcing daily profile view limit (category)', e);
      navigate(`/profile/${targetUserId}`);
    }
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
      <Header 
        userData={userData}
        showProfileDropdown={showProfileDropdown}
        setShowProfileDropdown={setShowProfileDropdown}
        dropdownRef={dropdownRef}
      />

      {/* Main Content */}
      <main className="category-matches-content">
        <div className="category-header">
          <button className="back-btn" onClick={() => navigate('/favorites')}>
            ← Back to Favorites
          </button>
          <h3 className="category-title">
            {getCategoryTitle()}
          </h3>
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
                            <img src="/images/vip.png" alt="VIP" className="vip-icon-img" />
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
                        <img 
                          src="/images/verified.png" 
                          alt="Verified" 
                          className="verified-badge-img"
                        />
                        <div className="online-status-indicator1">
                          <img
                            src="/images/online_now.png"
                            alt={isOnline ? "Online" : "Offline"}
                            className={`online-status-icon ${isOnline ? "online" : "offline"}`}
                          />
                          <span className={`online-text1 ${isOnline ? "online" : "offline"}`}>
                            {isOnline ? "Online now" : "Offline"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="match-details">
                        <div className="detail-columns">
                          <div className="detail-column-left">
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
                          <div className="detail-column-right">
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
                        className={`action-btn favorite-btn ${isFavorited ? 'favorited' : ''}`}
                        onClick={(e) => handleFavoriteToggle(e, user.userId || user.id)}
                        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <img 
                          src={isFavorited ? "/images/Heart_like.png" : "/images/Heart_unlike.png"} 
                          alt={isFavorited ? 'Liked' : 'Like'} 
                          className="action-icon" 
                        />
                      </button>
                      <button className="action-btn superlike-btn" title="Shortlist">
                        <img src="/images/Star.png" alt="Shortlist" className="action-icon" />
                      </button>
                      <button 
                        className="action-btn message-btn" 
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
              <p>To No luck at the moment.</p>
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
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="upgrade-modal-header">
              <h3 className="upgrade-modal-title">You’ve Reached Today’s Limit</h3>
              <p className="upgrade-modal-subtitle">Upgrade your plan to continue viewing profiles.</p>
            </div>
            <Upgrade embedded />
          </div>
        </div>
      )}
    </div>
  );
}