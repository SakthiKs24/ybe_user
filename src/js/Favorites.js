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
  onSnapshot 
} from 'firebase/firestore';
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
  const [allUsers, setAllUsers] = useState([]);
  const [discoverableUsersId, setDiscoverableUsersId] = useState([]);
  
  // Category lists (matching Flutter structure)
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
  
  const [dataFetched, setDataFetched] = useState(false);
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
              userId: userDoc.data().userId || userDoc.id,
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

  // State for being liked
  const [beingLikedPartnerId, setBeingLikedPartnerId] = useState([]);

  // Fetch initial data (matching Flutter fetchData)
  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.userId) return;

      try {
        // Liked partners will be fetched via real-time stream (see useEffect below)

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
        toast.error('Failed to load favorites data');
      }
    };

    fetchData();
  }, [userData?.userId]);

  // Stream liked partners (matching Flutter getFavoritesByUser)
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

  // Stream being liked partners (matching Flutter getFavoritesByOthers)
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

  // Stream all users (matching Flutter StreamBuilder)
  useEffect(() => {
    if (!userData?.userId || !dataFetched) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('profileDiscovery', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
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

      setAllUsers(users);
      
      // Update discoverable users ID list
      const discoverableIds = users
        .filter(user => user.profileDiscovery)
        .map(user => user.userId);
      setDiscoverableUsersId(discoverableIds);
    }, (error) => {
      console.error('Error fetching users:', error);
    });

    return () => unsubscribe();
  }, [userData?.userId, dataFetched]);

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

  // Calculate categorized users for UI (matching Flutter logic)
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
  const [countsLoading, setCountsLoading] = useState(true);

  // Update categorized users when data changes (matching Flutter buildCategoryTile logic)
  useEffect(() => {
    if (!allUsers.length || !userData?.userId) return;

    // Filter category IDs to only include discoverable users (matching Flutter: categoryWiseUserId.retainWhere)
    const filterDiscoverable = (userIds) => {
      return userIds.filter(userId => discoverableUsersId.includes(userId));
    };

    // Get user profiles for category (matching Flutter: currentCategoryUserProfileList)
    const getCategoryUsers = (userIds) => {
      const filteredIds = filterDiscoverable(userIds);
      return allUsers.filter(user => 
        user.profileDiscovery && filteredIds.includes(user.userId)
      );
    };

        setCategorizedUsers({
          liked: getCategoryUsers(likedPartnerId),
          beingLiked: getCategoryUsers(beingLikedPartnerId),
          samePassions: allUsers.filter(user => {
            if (!userData?.selectedPersonalityTraitsMap?.passions?.length) return false;
            const userPassions = user.selectedPersonalityTraitsMap?.passions || [];
            return userPassions.some(passion => 
              userData.selectedPersonalityTraitsMap.passions.includes(passion)
            ) && discoverableUsersId.includes(user.userId) && user.profileDiscovery;
          }),
          sameInterests: allUsers.filter(user => {
            if (!userData?.selectedLikesInvolvesMap?.interests?.length) return false;
            const userInterests = user.selectedLikesInvolvesMap?.interests || [];
            return userInterests.some(interest => 
              userData.selectedLikesInvolvesMap.interests.includes(interest)
            ) && discoverableUsersId.includes(user.userId) && user.profileDiscovery;
          }),
          sameProfession: getCategoryUsers(sameProfessionPartnerId),
          sameReligion: getCategoryUsers(sameReligionPartnerId),
          sameDegree: getCategoryUsers(sameDegreePartnerId),
          sameOriginCountry: getCategoryUsers(sameOriginCountryPartnerId),
          sameSettledCountry: getCategoryUsers(sameSettledCountryPartnerId),
          sameLocation: getCategoryUsers(sameLocationPartnerId),
          sameCity: [], // Not in Flutter but keeping for compatibility
          sameCountry: getCategoryUsers(sameSettledCountryPartnerId), // Maps to sameSettledCountry (uses settledCountry field)
          sameEducation: getCategoryUsers(sameDegreePartnerId), // Maps to sameDegree (uses degree field)
          sameNativeCountry: getCategoryUsers(sameOriginCountryPartnerId), // Maps to sameOriginCountry (uses originCountry field)
          sameMotherTongue: getCategoryUsers(sameMotherTonguePartnerId), // Uses motherTongue field
          sameStar: getCategoryUsers(sameStarPartnerId), // Uses selectedPersonalityTraitsMap.starSign field
          shortlisted: getCategoryUsers(shortListedPartnerId)
        });

    setCountsLoading(false);
  }, [allUsers, discoverableUsersId, likedPartnerId, beingLikedPartnerId, shortListedPartnerId, 
      sameProfessionPartnerId, sameReligionPartnerId, sameDegreePartnerId, 
      sameOriginCountryPartnerId, sameSettledCountryPartnerId, sameLocationPartnerId, 
      sameMotherTonguePartnerId, sameStarPartnerId, userData]);

  const handleCategoryClick = (category) => {
    navigate(`/favorites/${category}`);
  };

  if (loading || !dataFetched) {
    return (
      <div className="dashboard-loading">
        <img src="/images/logo.png" alt="Ybe Logo" className="loading-logo" />
      </div>
    );
  }

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

      {/* Content - Original UI structure */}
      <div className="favorites-content">
        <h2 className="favorites-title">Favourites</h2>
        
        <div className="categories-grid">
          {[
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
          ].map((category) => (
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
