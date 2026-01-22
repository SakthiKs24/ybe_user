import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot 
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import Header from './Header';
import SubHeader from './SubHeader';
import '../css/MyMatches.css';

export default function MyMatches() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('my-matches');
  const [allMatches, setAllMatches] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const dropdownRef = useRef(null);

  // Category lists
  const [likedPartnerId, setLikedPartnerId] = useState([]);
  const [shortListedPartnerId, setShortListedPartnerId] = useState([]);
  const [sameProfessionPartnerId, setSameProfessionPartnerId] = useState([]);
  const [sameReligionPartnerId, setSameReligionPartnerId] = useState([]);
  const [sameDegreePartnerId, setSameDegreePartnerId] = useState([]);
  const [sameOriginCountryPartnerId, setSameOriginCountryPartnerId] = useState([]);
  const [sameSettledCountryPartnerId, setSameSettledCountryPartnerId] = useState([]);
  const [sameLocationPartnerId, setSameLocationPartnerId] = useState([]);
  const [sameMotherTonguePartnerId, setSameMotherTonguePartnerId] = useState([]);
  const [sameStarPartnerId, setSameStarPartnerId] = useState([]);
  const [beingLikedPartnerId, setBeingLikedPartnerId] = useState([]);
  const [discoverableUsersId, setDiscoverableUsersId] = useState([]);
  const [dataFetched, setDataFetched] = useState(false);
  // Match modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatchUser, setSelectedMatchUser] = useState(null);
  // Pagination
  const ITEMS_PER_PAGE = 16;
  const [currentPage, setCurrentPage] = useState(1);
  // Per-load shuffle seed (new order on every page load)
  const shuffleSeedRef = useRef(Math.floor(Math.random() * 4294967295));
  const mulberry32 = (a) => {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  };
  // Stable per-load random key generator based on userId to avoid reshuffles on like
  const stringHash32 = (str) => {
    let h = 2166136261 >>> 0; // FNV-1a basis
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const stableRandomKeyForUser = (userId) => {
    const seed = shuffleSeedRef.current ^ stringHash32(String(userId));
    const rng = mulberry32(seed >>> 0);
    return rng();
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
              userId: userDoc.data().userId || userDoc.id,
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

  // Fetch initial data (matching Favorites.js)
  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.userId) return;

      try {
        // Fetch shortlisted partners
        const shortlistSnapshot = await getDocs(
          query(collection(db, 'shortlist'), where('shortlistedBy', '==', userData.userId))
        );
        const shortlistedIds = shortlistSnapshot.docs.map(doc => doc.data().shortlistedUser);
        setShortListedPartnerId(shortlistedIds);

        // Fetch same profession partners
        if (userData.dayJob) {
          const professionSnapshot = await getDocs(
            query(collection(db, 'users'), where('dayJob', '==', userData.dayJob))
          );
          const professionIds = professionSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
          setSameProfessionPartnerId(professionIds);
        }

        // Fetch same religion partners
        if (userData.religion) {
          const religionSnapshot = await getDocs(
            query(collection(db, 'users'), where('religion', '==', userData.religion))
          );
          const religionIds = religionSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
          setSameReligionPartnerId(religionIds);
        }

        // Fetch same degree partners
        if (userData.degree) {
          const degreeSnapshot = await getDocs(
            query(collection(db, 'users'), where('degree', '==', userData.degree))
          );
          const degreeIds = degreeSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
          setSameDegreePartnerId(degreeIds);
        }

        // Fetch same origin country partners
        if (userData.originCountry) {
          const originCountrySnapshot = await getDocs(
            query(collection(db, 'users'), where('originCountry', '==', userData.originCountry))
          );
          const originCountryIds = originCountrySnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
          setSameOriginCountryPartnerId(originCountryIds);
        }

        // Fetch same settled country partners
        if (userData.settledCountry) {
          const settledCountrySnapshot = await getDocs(
            query(collection(db, 'users'), where('settledCountry', '==', userData.settledCountry))
          );
          const settledCountryIds = settledCountrySnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
          setSameSettledCountryPartnerId(settledCountryIds);
        }

        // Fetch same location partners
        if (userData.currentPosition?.city) {
          const locationSnapshot = await getDocs(
            query(collection(db, 'users'), where('currentPosition.city', '==', userData.currentPosition.city))
          );
          const locationIds = locationSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
          setSameLocationPartnerId(locationIds);
        }

        // Fetch same mother tongue partners
        if (userData.motherTongue) {
          const motherTongueSnapshot = await getDocs(
            query(collection(db, 'users'), where('motherTongue', '==', userData.motherTongue))
          );
          const motherTongueIds = motherTongueSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
          setSameMotherTonguePartnerId(motherTongueIds);
        }

        // Fetch same star sign partners
        if (userData.selectedPersonalityTraitsMap?.starSign) {
          const starSignSnapshot = await getDocs(
            query(collection(db, 'users'), where('selectedPersonalityTraitsMap.starSign', '==', userData.selectedPersonalityTraitsMap.starSign))
          );
          const starSignIds = starSignSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const blockedUsers = data.blockedUsers || [];
              return doc.id !== userData.userId && !blockedUsers.includes(userData.userId);
            })
            .map(doc => doc.id);
          setSameStarPartnerId(starSignIds);
        }

        setDataFetched(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      }
    };

    fetchData();
  }, [userData?.userId]);

  // Stream liked partners
  useEffect(() => {
    if (!userData?.userId) return;

    const favoritesRef = collection(db, 'favorites');
    const q = query(favoritesRef, where('likedBy', '==', userData.userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const likedIds = snapshot.docs.map(doc => doc.data().likedUser.toString());
      setLikedPartnerId(likedIds);
    }, (error) => {
      console.error('Error fetching liked partners:', error);
    });

    return () => unsubscribe();
  }, [userData?.userId]);

  // Stream being liked partners
  useEffect(() => {
    if (!userData?.userId) return;

    const favoritesRef = collection(db, 'favorites');
    const q = query(favoritesRef, where('likedUser', '==', userData.userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const beingLikedIds = snapshot.docs.map(doc => doc.data().likedBy.toString());
      setBeingLikedPartnerId(beingLikedIds);
    }, (error) => {
      console.error('Error fetching being liked partners:', error);
    });

    return () => unsubscribe();
  }, [userData?.userId]);

  // Stream all users and compile matches
  useEffect(() => {
    if (!userData?.userId || !dataFetched) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('profileDiscovery', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentGender = userData?.userGender;
      const targetGender = currentGender === 'Female' ? 'Male' : currentGender === 'Male' ? 'Female' : null;
      const allUsers = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          const blockedUsers = data.blockedUsers || [];
          if (doc.id === userData.userId) return false;
          if (blockedUsers.includes(userData.userId)) return false;
          if (targetGender && data.userGender !== targetGender) return false;
          return true;
        })
        .map(doc => ({
          id: doc.id,
          userId: doc.id,
          ...doc.data()
        }));

      // Update discoverable users ID list
      const discoverableIds = allUsers
        .filter(user => user.profileDiscovery)
        .map(user => user.userId);
      setDiscoverableUsersId(discoverableIds);

      // Build a map of userId -> score and categories matched
      const userIdToScore = {};
      const addScore = (ids, categoryKey) => {
        ids.forEach((id) => {
          if (!discoverableIds.includes(id)) return;
          if (!userIdToScore[id]) userIdToScore[id] = { score: 0, categories: new Set() };
          userIdToScore[id].score += 1;
          userIdToScore[id].categories.add(categoryKey);
        });
      };

      addScore(beingLikedPartnerId, 'beingLiked');
      addScore(shortListedPartnerId, 'shortlisted');
      addScore(sameProfessionPartnerId, 'sameProfession');
      addScore(sameReligionPartnerId, 'sameReligion');
      addScore(sameDegreePartnerId, 'sameDegree');
      addScore(sameOriginCountryPartnerId, 'sameOriginCountry');
      addScore(sameSettledCountryPartnerId, 'sameSettledCountry');
      addScore(sameLocationPartnerId, 'sameLocation');
      addScore(sameMotherTonguePartnerId, 'sameMotherTongue');
      addScore(sameStarPartnerId, 'sameStar');

      // Passions and Interests incremental scoring
      allUsers.forEach(user => {
        const id = user.userId;
        if (!discoverableIds.includes(id)) return;
        // Passions
        if (userData?.selectedPersonalityTraitsMap?.passions?.length) {
          const myPassions = userData.selectedPersonalityTraitsMap.passions;
          const their = user.selectedPersonalityTraitsMap?.passions || [];
          if (their.some(p => myPassions.includes(p))) {
            if (!userIdToScore[id]) userIdToScore[id] = { score: 0, categories: new Set() };
            userIdToScore[id].score += 1;
            userIdToScore[id].categories.add('samePassions');
          }
        }
        // Interests
        if (userData?.selectedLikesInvolvesMap?.interests?.length) {
          const myInterests = userData.selectedLikesInvolvesMap.interests;
          const their = user.selectedLikesInvolvesMap?.interests || [];
          if (their.some(i => myInterests.includes(i))) {
            if (!userIdToScore[id]) userIdToScore[id] = { score: 0, categories: new Set() };
            userIdToScore[id].score += 1;
            userIdToScore[id].categories.add('sameInterests');
          }
        }
      });

      // Create unique matched users sorted by score desc
      const idToUser = {};
      allUsers.forEach(u => { idToUser[u.userId] = u; });

      const sortedUsers = Object.keys(userIdToScore)
        .map(id => ({
          ...idToUser[id],
          _matchScore: userIdToScore[id].score,
          _matchCategories: Array.from(userIdToScore[id].categories)
        }))
        .filter(u => u && u.profileDiscovery)
        .sort((a, b) => {
          // Higher score first; tie-breaker: being liked, then recently online
          if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore;
          const aLiked = beingLikedPartnerId.includes(a.userId) ? 1 : 0;
          const bLiked = beingLikedPartnerId.includes(b.userId) ? 1 : 0;
          if (bLiked !== aLiked) return bLiked - aLiked;
          const aOnline = a.onlineStatus ? 1 : 0;
          const bOnline = b.onlineStatus ? 1 : 0;
          return bOnline - aOnline;
        });

      // Use stable per-load tie-break to avoid reshuffling on like toggles
      const withStableKey = sortedUsers.map(u => ({
        ...u,
        _stableKey: stableRandomKeyForUser(u.userId)
      }));
      withStableKey.sort((a, b) => {
        if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore;
        // stable per-load random order within same score bucket
        return a._stableKey - b._stableKey;
      });
      setAllMatches(withStableKey.map(({ _stableKey, ...rest }) => rest));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.userId, dataFetched, /* likedPartnerId removed to keep order stable on like/dislike */ beingLikedPartnerId, shortListedPartnerId,
      sameProfessionPartnerId, sameReligionPartnerId, sameDegreePartnerId,
      sameOriginCountryPartnerId, sameSettledCountryPartnerId, sameLocationPartnerId,
      sameMotherTonguePartnerId, sameStarPartnerId]);

  // Clamp/reset current page when matches change
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(allMatches.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [allMatches.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleProfileClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleCardClick = (user) => {
    setSelectedMatchUser(user);
    setShowMatchModal(true);
  };

  const handleChatClick = (e, userId) => {
    e.stopPropagation();
    navigate(`/chat/${userId}`);
  };

  if (loading || !dataFetched) {
    return (
      <div className="dashboard-loading">
        <img src="/images/logo.png" alt="Ybe Logo" className="loading-logo" />
      </div>
    );
  }

  return (
    <div className="my-matches-container">
      <Header 
        userData={userData}
        showProfileDropdown={showProfileDropdown}
        setShowProfileDropdown={setShowProfileDropdown}
        dropdownRef={dropdownRef}
        currentPage="my-matches"
      />
      <SubHeader 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="my-matches-content">
        <h2 className="my-matches-title">My Matches</h2>
        
        <div className="matches-grid-cards">
          {allMatches.length > 0 ? (
            allMatches
              .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
              .map((user, index) => {
              const age = user.age || calculateAge(user.dateOfBirth) || 'N/A';
              const profileImage = user.profileImageUrls?.[0] || '/images/profile_badge.png';
              const isOnline = user.onlineStatus === true;
              const isFavorited = favorites.has(user.userId || user.id);
              const sizePattern = ['size-m', 'size-s', 'size-l', 'size-m', 'size-s', 'size-l'];
              const sizeClass = sizePattern[index % sizePattern.length];

              return (
                <div 
                  key={user.id} 
                  className={`match-profile-card ${sizeClass}`}
                  onClick={() => handleCardClick(user)}
                >
                  <div className="match-image-wrapper">
                    <img 
                      src={profileImage} 
                      alt={user.name || 'User'} 
                      className="match-profile-image" 
                    />
                    <button 
                      className={`favorite-heart-btn ${isFavorited ? 'favorited' : ''}`}
                      onClick={(e) => handleFavoriteToggle(e, user.userId || user.id)}
                    >
                      <img 
                        src={isFavorited ? '/images/Heart_like.png' : '/images/Heart_unlike.png'} 
                        alt="Favorite" 
                        className="heart-icon"
                      />
                    </button>
                    <div className="match-overlay">
                      <div className="match-overlay-info">
                        <h3 className="match-username">{user.name || 'Anonymous'}</h3>
                        <span className="match-age">{age}</span>
                        <span className="status-bullet">•</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-matches-found">
              <p>No matches found yet. Keep exploring!</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {allMatches.length > 0 && (
          <div className="pagination-container">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <div className="pagination-numbers">
              {(() => {
                const totalPages = Math.ceil(allMatches.length / ITEMS_PER_PAGE);
                const pages = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else if (currentPage <= 4) {
                  pages.push(1, 2, 3, 4, 5, '...', totalPages);
                } else if (currentPage >= totalPages - 3) {
                  pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                } else {
                  pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                }
                return pages.map((p, idx) =>
                  p === '...' ? (
                    <span key={`e-${idx}`} className="pagination-ellipsis">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`pagination-number ${currentPage === p ? 'active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  )
                );
              })()}
            </div>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage((p) => Math.min(Math.ceil(allMatches.length / ITEMS_PER_PAGE), p + 1))}
              disabled={currentPage === Math.ceil(allMatches.length / ITEMS_PER_PAGE)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Match Modal */}
      {showMatchModal && selectedMatchUser && (
        <div className="match-modal-overlay" onClick={() => setShowMatchModal(false)}>
          <div className="match-modal" onClick={(e) => e.stopPropagation()}>
            <button className="match-modal-close" onClick={() => setShowMatchModal(false)}>×</button>
            <div className="match-modal-pics">
              <div className="match-pic match-pic-left">
                <img 
                  src={selectedMatchUser.profileImageUrls?.[0] || '/images/profile_badge.png'} 
                  alt={selectedMatchUser.name || 'Match'} 
                />
              </div>
              <div className="match-pic match-pic-right">
                <img 
                  src={userData?.profileImageUrls?.[0] || '/images/profile_badge.png'} 
                  alt="You" 
                />
              </div>
            </div>
            <h2 className="match-modal-title">It’s a match</h2>
            <p className="match-modal-subtitle">you have 80% match with this profile</p>
            <button
              className="btn-gradient"
              onClick={() => {
                setShowMatchModal(false);
                navigate(`/chat/${selectedMatchUser.userId || selectedMatchUser.id}`);
              }}
            >
              Say Hello
            </button>
            <button
              className="match-see-profile"
              onClick={() => {
                setShowMatchModal(false);
                handleProfileClick(selectedMatchUser.userId || selectedMatchUser.id);
              }}
            >
              See The Profile
            </button>
          </div>
        </div>
      )}

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