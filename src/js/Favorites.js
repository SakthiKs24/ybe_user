import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/Favorites.css';

export default function Favorites() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('new-matches');
  const [favorites, setFavorites] = useState([]);
  const [categorizedUsers, setCategorizedUsers] = useState({
    liked: [],
    beingLiked: [],
    samePassions: [],
    sameInterests: [],
    sameProfession: [],
    sameCity: [],
    sameCountry: [],
    sameEducation: [],
    sameReligion: [],
    sameNativeCountry: [],
    sameMotherTongue: [],
    sameStar: [],
    shortlisted: []
  });
  const dropdownRef = useRef(null);

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

  // Fetch favorites and categorize users
  useEffect(() => {
    const fetchFavoritesAndCategorize = async () => {
      if (!userData?.uid) return;
      
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
        
        // Fetch in chunks of 30 (Firestore limit)
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

        setFavorites(allFavoriteUsers);

        // Categorize users
        const categorized = {
          liked: allFavoriteUsers,
          beingLiked: [],
          samePassions: [],
          sameInterests: [],
          sameProfession: [],
          sameCity: [],
          sameCountry: [],
          sameEducation: [],
          sameReligion: [],
          sameNativeCountry: [],
          sameMotherTongue: [],
          sameStar: [],
          shortlisted: []
        };

        // Check who liked current user back
        const likedByQuery = query(favoritesRef, where('likedUser', '==', userData.userId));
        const likedBySnapshot = await getDocs(likedByQuery);
        const likedByIds = new Set();
        likedBySnapshot.forEach((doc) => {
          likedByIds.add(doc.data().likedBy);
        });

        // Fetch shortlisted users
        const shortlistedRef = collection(db, 'shortlisted');
        const shortlistedQuery = query(shortlistedRef, where('shortlistedBy', '==', userData.userId));
        const shortlistedSnapshot = await getDocs(shortlistedQuery);
        const shortlistedIds = new Set();
        shortlistedSnapshot.forEach((doc) => {
          shortlistedIds.add(doc.data().shortlistedUser);
        });

        allFavoriteUsers.forEach((user) => {
          // Being Liked
          if (likedByIds.has(user.userId)) {
            categorized.beingLiked.push(user);
          }

          // Shortlisted
          if (shortlistedIds.has(user.userId)) {
            categorized.shortlisted.push(user);
          }

          // Same Passions
          if (user.passions && userData.passions) {
            const commonPassions = user.passions.filter(p => userData.passions.includes(p));
            if (commonPassions.length > 0) {
              categorized.samePassions.push(user);
            }
          }

          // Same Interests
          if (user.interests && userData.interests) {
            const commonInterests = user.interests.filter(i => userData.interests.includes(i));
            if (commonInterests.length > 0) {
              categorized.sameInterests.push(user);
            }
          }

          // Same Profession
          if (user.dayJob && userData.dayJob && user.dayJob === userData.dayJob) {
            categorized.sameProfession.push(user);
          }

          // Same City
          if (user.currentPosition?.city && userData.currentPosition?.city && 
              user.currentPosition.city === userData.currentPosition.city) {
            categorized.sameCity.push(user);
          }

          // Same Country
          if (user.settledCountry && userData.settledCountry && 
              user.settledCountry === userData.settledCountry) {
            categorized.sameCountry.push(user);
          }

          // Same Education
          if (user.education && userData.education && user.education === userData.education) {
            categorized.sameEducation.push(user);
          }

          // Same Religion
          if (user.religion && userData.religion && user.religion === userData.religion) {
            categorized.sameReligion.push(user);
          }

          // Same Native Country
          if (user.nativeCountry && userData.nativeCountry && 
              user.nativeCountry === userData.nativeCountry) {
            categorized.sameNativeCountry.push(user);
          }

          // Same Mother Tongue
          if (user.motherTongue && userData.motherTongue && 
              user.motherTongue === userData.motherTongue) {
            categorized.sameMotherTongue.push(user);
          }

          // Same Star
          if (user.star && userData.star && user.star === userData.star) {
            categorized.sameStar.push(user);
          }
        });

        setCategorizedUsers(categorized);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        toast.error('Failed to load favorites');
      } finally {
        setLoading(false);
      }
    };

    fetchFavoritesAndCategorize();
  }, [userData?.uid]);

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

  const handleCategoryClick = (category) => {
    navigate(`/favorites/${category}`);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <img src="/images/logo.png" alt="Ybe Logo" className="loading-logo" />
      </div>
    );
  }

  const categories = [
    { key: 'liked', label: 'Liked', image: '/images/my_favorites/liked.png', count: categorizedUsers.liked.length },
    { key: 'beingLiked', label: 'Being Liked', image: '/images/my_favorites/being_liked.png', count: categorizedUsers.beingLiked.length },
    { key: 'samePassions', label: 'Same Passions', image: '/images/my_favorites/same_passions.png', count: categorizedUsers.samePassions.length },
    { key: 'sameInterests', label: 'Same Interests', image: '/images/my_favorites/same_interests.png', count: categorizedUsers.sameInterests.length },
    { key: 'sameProfession', label: 'Same Profession', image: '/images/my_favorites/same_professions.png', count: categorizedUsers.sameProfession.length },
    { key: 'sameCity', label: 'Same City', image: '/images/my_favorites/same_city.png', count: categorizedUsers.sameCity.length },
    { key: 'sameCountry', label: 'Same Country', image: '/images/my_favorites/same_country.png', count: categorizedUsers.sameCountry.length },
    { key: 'sameEducation', label: 'Same Level Education', image: '/images/my_favorites/same_education.png', count: categorizedUsers.sameEducation.length },
    { key: 'sameReligion', label: 'Same Religion', image: '/images/my_favorites/same_religion.png', count: categorizedUsers.sameReligion.length },
    { key: 'sameNativeCountry', label: 'Same Native Country', image: '/images/my_favorites/same_native_country.png', count: categorizedUsers.sameNativeCountry.length },
    { key: 'sameMotherTongue', label: 'Same Mother Tongue', image: '/images/my_favorites/same_mother_tongue.png', count: categorizedUsers.sameMotherTongue.length },
    { key: 'sameStar', label: 'Same Star', image: '/images/my_favorites/same_star.png', count: categorizedUsers.sameStar.length },
    { key: 'shortlisted', label: 'Shortlisted', image: '/images/my_favorites/shortlisted.jpg', count: categorizedUsers.shortlisted.length }
  ];

  return (
    <div className="favorites-container">
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

      {/* Tabs */}
      <div className="favorites-tabs">
        <button 
          className={`tab-btn ${activeTab === 'new-matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('new-matches')}
        >
          New matches
        </button>
        <button 
          className={`tab-btn ${activeTab === 'my-matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-matches')}
        >
          My matches
        </button>
        <button 
          className={`tab-btn ${activeTab === 'favourites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favourites')}
        >
          Favourites
        </button>
      </div>

      {/* Content */}
      <div className="favorites-content">
        <h2 className="favorites-title">Favourites</h2>
        
        <div className="categories-grid">
          {categories.map((category) => (
            <div 
              key={category.key} 
              className="category-card"
              onClick={() => handleCategoryClick(category.key)}
            >
              <img 
                src={category.image} 
                alt={category.label} 
                className="category-image"
              />
              <div className="category-footer">
                <span className="category-label">{category.label}</span>
                <div className="category-count">
                  <span className="count-icon">❤️</span>
                  <span className="count-number">{category.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
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