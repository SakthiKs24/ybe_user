import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc, documentId } from 'firebase/firestore';
import { toast } from 'react-toastify';
import Header from './Header';
import SubHeader from './SubHeader';
import '../css/Favorites.css';

export default function Favorites() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('favourites');
  const [favorites, setFavorites] = useState([]);
  const [countsLoading, setCountsLoading] = useState(true);
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

        // Don't return early - we still need to fetch other categories

        // Fetch user details for favorites
        const usersRef = collection(db, 'users');
        const allFavoriteUsers = [];
        
        // Only fetch favorite users if there are any
        if (favoriteUserIds.length > 0) {
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

        // Fetch all users who liked the current user
        const likedByQuery = query(favoritesRef, where('likedUser', '==', userData.userId));
        const likedBySnapshot = await getDocs(likedByQuery);
        const likedByUserIds = [];
        likedBySnapshot.forEach((doc) => {
          likedByUserIds.push(doc.data().likedBy);
        });

        // Fetch user details for users who liked the current user
        if (likedByUserIds.length > 0) {
          const usersRef = collection(db, 'users');
          
          for (let i = 0; i < likedByUserIds.length; i += 30) {
            const chunk = likedByUserIds.slice(i, Math.min(i + 30, likedByUserIds.length));
            const usersQuery = query(usersRef, where(documentId(), 'in', chunk));
            const usersSnapshot = await getDocs(usersQuery);
            
            usersSnapshot.forEach((doc) => {
              categorized.beingLiked.push({
                id: doc.id,
                userId: doc.id,
                ...doc.data()
              });
            });
          }
        }

        // Fetch users with same passions
        // Check both top-level passions and selectedPersonalityTraitsMap.passions
        const allAuthPassions = new Set();
        
        // Add top-level passions
        if (userData?.passions && Array.isArray(userData.passions)) {
          userData.passions.forEach(p => allAuthPassions.add(p));
        }
        
        // Add selectedPersonalityTraitsMap.passions
        if (userData?.selectedPersonalityTraitsMap?.passions && Array.isArray(userData.selectedPersonalityTraitsMap.passions)) {
          userData.selectedPersonalityTraitsMap.passions.forEach(p => allAuthPassions.add(p));
        }
        
        if (allAuthPassions.size > 0) {
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          
          usersSnapshot.forEach((doc) => {
            const user = {
              id: doc.id,
              userId: doc.id,
              ...doc.data()
            };
            
            // Check for matches in both locations
            let hasMatchingPassion = false;
            
            // Check top-level passions
            if (user.passions && Array.isArray(user.passions)) {
              hasMatchingPassion = user.passions.some(passion => allAuthPassions.has(passion));
            }
            
            // Check selectedPersonalityTraitsMap.passions if no match found yet
            if (!hasMatchingPassion && user.selectedPersonalityTraitsMap?.passions && Array.isArray(user.selectedPersonalityTraitsMap.passions)) {
              hasMatchingPassion = user.selectedPersonalityTraitsMap.passions.some(passion => allAuthPassions.has(passion));
            }
            
            if (hasMatchingPassion) {
              categorized.samePassions.push(user);
            }
          });
        }
        
        // Fetch users with same interests
        // Check both top-level interests and selectedLikesInvolvesMap.interests
        const allAuthInterests = new Set();
        
        // Add top-level interests
        if (userData?.interests && Array.isArray(userData.interests)) {
          userData.interests.forEach(i => allAuthInterests.add(i));
        }
        
        // Add selectedLikesInvolvesMap.interests
        if (userData?.selectedLikesInvolvesMap?.interests && Array.isArray(userData.selectedLikesInvolvesMap.interests)) {
          userData.selectedLikesInvolvesMap.interests.forEach(i => allAuthInterests.add(i));
        }
        
        if (allAuthInterests.size > 0) {
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          
          usersSnapshot.forEach((doc) => {
            const user = {
              id: doc.id,
              userId: doc.id,
              ...doc.data()
            };
            
            // Check for matches in both locations
            let hasMatchingInterest = false;
            
            // Check top-level interests
            if (user.interests && Array.isArray(user.interests)) {
              hasMatchingInterest = user.interests.some(interest => allAuthInterests.has(interest));
            }
            
            // Check selectedLikesInvolvesMap.interests if no match found yet
            if (!hasMatchingInterest && user.selectedLikesInvolvesMap?.interests && Array.isArray(user.selectedLikesInvolvesMap.interests)) {
              hasMatchingInterest = user.selectedLikesInvolvesMap.interests.some(interest => allAuthInterests.has(interest));
            }
            
            if (hasMatchingInterest) {
              categorized.sameInterests.push(user);
            }
          });
        }

        // Fetch users with same profession
        if (userData?.dayJob) {
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          
          usersSnapshot.forEach((doc) => {
            // Skip the authenticated user
            if (doc.id === userData.userId) return;
            
            const user = {
              id: doc.id,
              userId: doc.id,
              ...doc.data()
            };
            
            // Check if user has same dayJob as auth user
            if (user.dayJob && user.dayJob === userData.dayJob) {
              categorized.sameProfession.push(user);
            }
          });
        }

        // Fetch users with same country
        if (userData?.settledCountry) {
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          
          usersSnapshot.forEach((doc) => {
            // Skip the authenticated user
            if (doc.id === userData.userId) return;
            
            const user = {
              id: doc.id,
              userId: doc.id,
              ...doc.data()
            };
            
            // Check if user has same settledCountry as auth user
            if (user.settledCountry && user.settledCountry === userData.settledCountry) {
              categorized.sameCountry.push(user);
            }
          });
        }

        // Fetch shortlisted users
        const shortlistRef = collection(db, 'shortlist');
        const shortlistQuery = query(shortlistRef, where('shortlistedBy', '==', userData.userId));
        const shortlistSnapshot = await getDocs(shortlistQuery);
        const shortlistedIds = new Set();
        shortlistSnapshot.forEach((doc) => {
          shortlistedIds.add(doc.data().shortlistedUser);
        });

        // Only process favorite users if they exist
        if (allFavoriteUsers.length > 0) {
          allFavoriteUsers.forEach((user) => {
            // Shortlisted
            if (shortlistedIds.has(user.userId)) {
              categorized.shortlisted.push(user);
            }

            // Same Passions - only add if not already in the list
            // Check for matching passions in both top-level and selectedPersonalityTraitsMap
            let hasMatchingPassion = false;
            
            // Check top-level passions
            if (user.passions && Array.isArray(user.passions)) {
              hasMatchingPassion = user.passions.some(passion => allAuthPassions.has(passion));
            }
            
            // Check selectedPersonalityTraitsMap.passions if no match found yet
            if (!hasMatchingPassion && user.selectedPersonalityTraitsMap?.passions && Array.isArray(user.selectedPersonalityTraitsMap.passions)) {
              hasMatchingPassion = user.selectedPersonalityTraitsMap.passions.some(passion => allAuthPassions.has(passion));
            }
            
            if (hasMatchingPassion) {
              // Check if user is already in samePassions to avoid duplicates
              const userAlreadyInSamePassions = categorized.samePassions.some(u => u.userId === user.userId);
              if (!userAlreadyInSamePassions) {
                categorized.samePassions.push(user);
              }
            }

            // Same Interests
            // Combine user interests from both locations
            const userAllInterests = new Set();
            
            // Add top-level interests
            if (user.interests && Array.isArray(user.interests)) {
              user.interests.forEach(i => userAllInterests.add(i));
            }
            
            // Add selectedLikesInvolvesMap.interests
            if (user.selectedLikesInvolvesMap?.interests && Array.isArray(user.selectedLikesInvolvesMap.interests)) {
              user.selectedLikesInvolvesMap.interests.forEach(i => userAllInterests.add(i));
            }
            
            // Combine auth user interests from both locations
            const authAllInterests = new Set();
            
            // Add top-level interests
            if (userData.interests && Array.isArray(userData.interests)) {
              userData.interests.forEach(i => authAllInterests.add(i));
            }
            
            // Add selectedLikesInvolvesMap.interests
            if (userData.selectedLikesInvolvesMap?.interests && Array.isArray(userData.selectedLikesInvolvesMap.interests)) {
              userData.selectedLikesInvolvesMap.interests.forEach(i => authAllInterests.add(i));
            }
            
            // Check if there are any common interests
            if (authAllInterests.size > 0 && userAllInterests.size > 0) {
              const hasCommonInterest = [...userAllInterests].some(interest => authAllInterests.has(interest));
              if (hasCommonInterest) {
                categorized.sameInterests.push(user);
              }
            }

            // Same City
            if (user.currentPosition?.city && userData.currentPosition?.city && 
                user.currentPosition.city === userData.currentPosition.city) {
              categorized.sameCity.push(user);
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
        }

        setCategorizedUsers(categorized);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        toast.error('Failed to load favorites');
      } finally {
        setCountsLoading(false);
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

  // Handle specific category view
  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get('category');
  const specificCategory = categoryParam || null;

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
      <Header 
        userData={userData}
        showProfileDropdown={showProfileDropdown}
        setShowProfileDropdown={setShowProfileDropdown}
        dropdownRef={dropdownRef}
        currentPage="favorites"
      />
      <SubHeader 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

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
                  <span className="count-number">
                    {countsLoading ? (
                      <span className="count-loader">•••</span>
                    ) : (
                      category.count
                    )}
                  </span>
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