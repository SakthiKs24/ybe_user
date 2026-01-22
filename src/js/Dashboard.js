import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, getDoc, query, where, documentId, doc, updateDoc, addDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import Header from './Header';
import SubHeader from './SubHeader';
import Upgrade from './Upgrade';
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
  const [uniqueLanguages, setUniqueLanguages] = useState([]);
  const [uniqueJobs, setUniqueJobs] = useState([]);
  const [uniqueLookingFor, setUniqueLookingFor] = useState([]);
  const [uniqueEducation, setUniqueEducation] = useState([]);
  const [uniqueReligions, setUniqueReligions] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [blockedUsers, setBlockedUsers] = useState(new Set());
  const [shortlistedUsers, setShortlistedUsers] = useState(new Set());
  const [messagedUsers, setMessagedUsers] = useState(new Set());
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [userToBlock, setUserToBlock] = useState(null);
  const dropdownRef = useRef(null);
  const [activeTab, setActiveTab] = useState('new-matches');
  const [expandedBios, setExpandedBios] = useState({});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [profileViewLimit, setProfileViewLimit] = useState(null);
  
  // Per-load shuffling utilities (new order on each page load)
  const shuffleSeedRef = useRef(Math.floor(Math.random() * 4294967295));
  const mulberry32 = (a) => {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  };
  const shuffleArray = (arr) => {
    const rng = mulberry32(shuffleSeedRef.current);
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  
  // Filter states
  const [filters, setFilters] = useState({
    location: 'All',
    language: 'All',
    job: 'All',
    lookingFor: 'All',
    education: 'All',
    religion: 'All',
    sortBy: 'High Match',
    age: [20, 60],
    maxDistance: [0, 500], // 0 to 500 km
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

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
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

  // Fetch blocked users
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!userData?.uid) return;
      
      try {
        const blockRef = collection(db, 'block');
        const blockQuery = query(blockRef, where(documentId(), '==', userData.uid));
        const blockSnapshot = await getDocs(blockQuery);
        
        if (!blockSnapshot.empty) {
          const blockData = blockSnapshot.docs[0].data();
          const blockedBy = blockData.blockedBy || [];
          setBlockedUsers(new Set(blockedBy));
        }
      } catch (error) {
        console.error('Error fetching blocked users:', error);
      }
    };

    fetchBlockedUsers();
  }, [userData?.uid]);

  // Fetch shortlisted users for current user
  useEffect(() => {
    const fetchShortlisted = async () => {
      if (!userData?.userId) return;
      try {
        const shortlistRef = collection(db, 'shortlist');
        const q = query(shortlistRef, where('shortlistedBy', '==', userData.userId));
        const snap = await getDocs(q);
        const setIds = new Set();
        snap.forEach(d => {
          const v = d.data()?.shortlistedUser;
          if (v) setIds.add(String(v));
        });
        setShortlistedUsers(setIds);
      } catch (e) {
        console.error('Error fetching shortlisted users:', e);
      }
    };
    fetchShortlisted();
  }, [userData?.userId]);

  // Fetch users with whom the current user has chats (to show filled message icon)
  useEffect(() => {
    const fetchMessaged = async () => {
      if (!userData?.userId) return;
      try {
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('chatUserData.participants', 'array-contains', userData.userId));
        const snap = await getDocs(q);
        const setIds = new Set();
        snap.forEach(docSnap => {
          const data = docSnap.data() || {};
          const parts = (data.chatUserData && data.chatUserData.participants) || data.participants || [];
          if (Array.isArray(parts)) {
            parts.forEach(p => {
              if (String(p) !== String(userData.userId)) {
                setIds.add(String(p));
              }
            });
          }
        });
        setMessagedUsers(setIds);
      } catch (e) {
        console.error('Error fetching messaged users:', e);
      }
    };
    fetchMessaged();
  }, [userData?.userId]);

  // Fetch all users excluding current user and blocked users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userData?.uid) return;
      
      setFilterLoading(true);
      
      try {
        const usersRef = collection(db, 'users');
        // Fetch all discoverable users; exclude current user later
        const userQuery = query(
          usersRef,
          where('profileDiscovery', '==', true)
        );
        
        const querySnapshot = await getDocs(userQuery);
        
        // Map snapshot to users, exclude current user
        const users = [];
        const currentGender = userData?.userGender;
        const targetGender = currentGender === 'Female' ? 'Male' : currentGender === 'Male' ? 'Female' : null;
        const locationsSet = new Set();
        const languagesSet = new Set();
        const jobsSet = new Set();
        const lookingForSet = new Set();
        const educationSet = new Set();
        const religionsSet = new Set();
        
        querySnapshot.forEach((doc) => {
          if (doc.id !== userData.uid) {
            const userData = doc.data();
            // Enforce opposite-gender filtering if we know current user's gender
            if (targetGender && userData.userGender !== targetGender) {
              return;
            }
            users.push({
              id: doc.id,
              userId: doc.id,
              ...userData
            });
            
            // Extract unique values for dropdowns
            if (userData.settledCountry) {
              locationsSet.add(userData.settledCountry);
            }
            if (userData.motherTongue) {
              languagesSet.add(userData.motherTongue);
            }
            if (userData.dayJob) {
              jobsSet.add(userData.dayJob);
            }
            if (userData.lookingFor) {
              lookingForSet.add(userData.lookingFor);
            }
            if (userData.degree) {
              educationSet.add(userData.degree);
            }
            if (userData.religion) {
              religionsSet.add(userData.religion);
            }
          }
        });
        
        // Set unique values for dropdowns
        setUniqueLocations(['All', ...Array.from(locationsSet).filter(loc => loc && loc.trim() !== '').sort()]);
        setUniqueLanguages(['All', ...Array.from(languagesSet).filter(lang => lang && lang.trim() !== '').sort()]);
        setUniqueJobs(['All', ...Array.from(jobsSet).filter(job => job && job.trim() !== '').sort()]);
        setUniqueLookingFor(['All', ...Array.from(lookingForSet).filter(lf => lf && lf.trim() !== '').sort()]);
        setUniqueEducation(['All', ...Array.from(educationSet).filter(edu => edu && edu.trim() !== '').sort()]);
        setUniqueReligions(['All', ...Array.from(religionsSet).filter(rel => rel && rel.trim() !== '').sort()]);
        
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
        
        // Shuffle to randomize order
        const randomized = shuffleArray(filteredUsers);
        setAllUsers(randomized);
        setFilteredUsers(randomized);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setFilterLoading(false);
      }
    };

    fetchUsers();
  }, [userData?.uid]);

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
          return userLocation === filters.location;
        });
      }

      // Filter by language
      if (filters.language && filters.language !== 'All') {
        filtered = filtered.filter(user => {
          const userLanguage = user.motherTongue || '';
          return userLanguage === filters.language;
        });
      }

      // Filter by job
      if (filters.job && filters.job !== 'All') {
        filtered = filtered.filter(user => {
          const userJob = user.dayJob || '';
          return userJob === filters.job;
        });
      }

      // Filter by looking for
      if (filters.lookingFor && filters.lookingFor !== 'All') {
        filtered = filtered.filter(user => {
          const userLookingFor = user.lookingFor || '';
          return userLookingFor === filters.lookingFor;
        });
      }

      // Filter by education
      if (filters.education && filters.education !== 'All') {
        filtered = filtered.filter(user => {
          const userEducation = user.degree || '';
          return userEducation === filters.education;
        });
      }

      // Filter by religion
      if (filters.religion && filters.religion !== 'All') {
        filtered = filtered.filter(user => {
          const userReligion = user.religion || '';
          return userReligion === filters.religion;
        });
      }

      // Filter by maximum distance
      if (filters.maxDistance[1] < 500 && userData?.currentPosition?.latitude && userData?.currentPosition?.longitude) {
        filtered = filtered.filter(user => {
          if (!user.currentPosition?.latitude || !user.currentPosition?.longitude) {
            return false; // Exclude users without location data
          }
          
          const distance = calculateDistance(
            userData.currentPosition.latitude,
            userData.currentPosition.longitude,
            user.currentPosition.latitude,
            user.currentPosition.longitude
          );
          
          return distance >= filters.maxDistance[0] && distance <= filters.maxDistance[1];
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

      // Randomize the final order so the first profile varies
      setFilteredUsers(shuffleArray(filtered));
      setFilterLoading(false);
    }, 100);

    return () => clearTimeout(filterTimeout);
  }, [filters, allUsers, userData?.currentPosition]);

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

  // Handle favorite toggle
  const handleFavoriteToggle = async (e, userId) => {
    e.stopPropagation(); // Prevent card click
    
    if (!userData?.uid) return;
    
    try {
      const isFavorite = favorites.has(userId);
      
      if (isFavorite) {
        // Remove from favorites
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
        // Add to favorites
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

  // Helper function to generate a random string
  const generateRandomId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  // Handle superlike
  const handleSuperlike = async (e, userId) => {
    e.stopPropagation(); // Prevent card click
    
    if (!userData?.uid) return;
    
    try {
      // Check if a shortlist document already exists
      const shortlistRef = collection(db, 'shortlist');
      const q = query(
        shortlistRef,
        where('shortlistedBy', '==', userData.userId),
        where('shortlistedUser', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // If document exists, remove it (unshortlist)
        querySnapshot.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, 'shortlist', docSnapshot.id));
        });
        
        console.log('User unshortlisted:', {
          shortlistedBy: userData.userId,
          shortlistedUser: userId
        });
        
        toast.success('Shortlist removed!');
        setShortlistedUsers(prev => {
          const s = new Set(prev);
          s.delete(String(userId));
          return s;
        });
      } else {
        // If document doesn't exist, create it (shortlist)
        const customDocId = `${userData.userId}-${generateRandomId()}`;
        
        // Using setDoc with custom ID instead of addDoc
        const docRef = doc(collection(db, 'shortlist'), customDocId);
        await setDoc(docRef, {
          shortlistedBy: userData.userId,
          shortlistedUser: userId,
        });
        
        console.log('Shortlist document created with ID:', customDocId);
        
        console.log('User shortlisted:', {
          shortlistedBy: userData.userId,
          shortlistedUser: userId
        });
        
        toast.success('User shortlisted!');
        setShortlistedUsers(prev => new Set(prev).add(String(userId)));
      }
    } catch (error) {
      console.error('Error handling shortliste:', error);
      toast.error('Failed to update shortliste');
    }
  };

  // Handle block toggle
  const handleBlockToggle = async (e, userId, userName) => {
    e.stopPropagation(); // Prevent card click
    
    if (!userData?.uid) return;
    
    const isBlocked = blockedUsers.has(userId);
    
    if (isBlocked) {
      // Directly unblock without confirmation
      try {
        const blockRef = collection(db, 'block');
        const blockDocRef = doc(blockRef, userData.uid);
        const blockQuery = query(blockRef, where(documentId(), '==', userData.uid));
        const blockSnapshot = await getDocs(blockQuery);
        
        if (!blockSnapshot.empty) {
          const currentBlockData = blockSnapshot.docs[0].data();
          const updatedBlockedBy = (currentBlockData.blockedBy || []).filter(id => id !== userId);
          
          await updateDoc(blockDocRef, {
            blockedBy: updatedBlockedBy
          });
        }
        
        setBlockedUsers(prev => {
          const newBlocked = new Set(prev);
          newBlocked.delete(userId);
          return newBlocked;
        });
        
        toast.success('User unblocked');
      } catch (error) {
        console.error('Error unblocking user:', error);
        toast.error('Failed to unblock user');
      }
    } else {
      // Show confirmation dialog before blocking
      setUserToBlock({ userId, userName });
      setShowBlockConfirm(true);
    }
  };

  // Confirm block action
  const confirmBlock = async () => {
    if (!userData?.uid || !userToBlock) return;
    
    try {
      const blockRef = collection(db, 'block');
      const blockDocRef = doc(blockRef, userData.uid);
      const blockQuery = query(blockRef, where(documentId(), '==', userData.uid));
      const blockSnapshot = await getDocs(blockQuery);
      
      if (blockSnapshot.empty) {
        // Create new block document using setDoc
        await setDoc(blockDocRef, {
          blockedBy: [userToBlock.userId]
        });
      } else {
        // Update existing block document
        const currentBlockData = blockSnapshot.docs[0].data();
        const updatedBlockedBy = [...(currentBlockData.blockedBy || []), userToBlock.userId];
        
        await updateDoc(blockDocRef, {
          blockedBy: updatedBlockedBy
        });
      }
      
      setBlockedUsers(prev => new Set(prev).add(userToBlock.userId));
      toast.success('Blocked this user');
      setShowBlockConfirm(false);
      setUserToBlock(null);
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
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

  // Handle profile navigation with daily limit enforcement for Free plan
  const handleProfileClick = async (targetUserId) => {
    try {
      const planName = userData?.subscriptions?.planName || 'Free';
      if (String(planName).toLowerCase() !== 'free') {
        navigate(`/profile/${targetUserId}`);
        return;
      }
      // If limit not configured, default deny additional views after 5 per day
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
      // Update daily counter in Firestore
      const newCount = usedCount + 1;
      const userDocRef = doc(db, 'users', userData.userId);
      await updateDoc(userDocRef, {
        'dailyLimit.date': today,
        'dailyLimit.profileViewCount': newCount,
        // keep swipeCount as is if present; do not overwrite
      });
      // Update local state to avoid refetch
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
      console.error('Failed enforcing daily profile view limit', e);
      // Fallback: allow navigation
      navigate(`/profile/${targetUserId}`);
    }
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
      <Header 
        userData={userData}
        showProfileDropdown={showProfileDropdown}
        setShowProfileDropdown={setShowProfileDropdown}
        dropdownRef={dropdownRef}
        currentPage="dashboard"
      />
      <SubHeader 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="dashboard-content">
        {/* Left Sidebar - Filters */}
        <aside className="filters-sidebar">
          <h4 className="sidebar-title">New matches</h4>
          
        
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
            <label className="filter-label">Language</label>
            <select 
              className="filter-select"
              value={filters.language}
              onChange={(e) => handleFilterChange('language', e.target.value)}
            >
              {uniqueLanguages.map((language, index) => (
                <option key={index} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <label className="filter-label">Professional Job</label>
            <select 
              className="filter-select"
              value={filters.job}
              onChange={(e) => handleFilterChange('job', e.target.value)}
            >
              {uniqueJobs.map((job, index) => (
                <option key={index} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <label className="filter-label">Looking For</label>
            <select 
              className="filter-select"
              value={filters.lookingFor}
              onChange={(e) => handleFilterChange('lookingFor', e.target.value)}
            >
              {uniqueLookingFor.map((lf, index) => (
                <option key={index} value={lf}>
                  {lf}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <label className="filter-label">Educational Qualification</label>
            <select 
              className="filter-select"
              value={filters.education}
              onChange={(e) => handleFilterChange('education', e.target.value)}
            >
              {uniqueEducation.map((edu, index) => (
                <option key={index} value={edu}>
                  {edu}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <label className="filter-label">Religion</label>
            <select 
              className="filter-select"
              value={filters.religion}
              onChange={(e) => handleFilterChange('religion', e.target.value)}
            >
              {uniqueReligions.map((religion, index) => (
                <option key={index} value={religion}>
                  {religion}
                </option>
              ))}
            </select>
          </div>

          
          <div className="filter-section">
            <label className="filter-label">Maximum Distance (km)</label>
            
            <div className="age-range-display">
              <span className="age-value">{filters.maxDistance[0]}</span>
              <span className="age-separator">-</span>
              <span className="age-value">{filters.maxDistance[1]}</span>
              <span className="age-unit">km</span>
            </div>
            <div className="slider-labels">
              <span>0</span>
              <span>125</span>
              <span>250</span>
              <span>375</span>
              <span>500</span>
            </div>
            <div className="dual-range-slider">
              <div className="slider-track">
                <div 
                  className="slider-range" 
                  style={{
                    left: `${(filters.maxDistance[0] / 500) * 100}%`,
                    width: `${((filters.maxDistance[1] - filters.maxDistance[0]) / 500) * 100}%`
                  }}
                ></div>
              </div>
              
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={filters.maxDistance[0]}
                onChange={(e) => {
                  const newMin = parseInt(e.target.value);
                  if (newMin < filters.maxDistance[1]) {
                    handleFilterChange('maxDistance', [newMin, filters.maxDistance[1]]);
                  }
                }}
                className="slider-thumb slider-thumb-min"
              />
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={filters.maxDistance[1]}
                onChange={(e) => {
                  const newMax = parseInt(e.target.value);
                  if (newMax > filters.maxDistance[0]) {
                    handleFilterChange('maxDistance', [filters.maxDistance[0], newMax]);
                  }
                }}
                className="slider-thumb slider-thumb-max"
              />
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
                  New matches who match your preferences 
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
                    
                    const uidStr = String(user.userId || user.id);
                    const isFavorited = favorites.has(uidStr);
                    const isBlocked = blockedUsers.has(uidStr);
                    const isShortlisted = shortlistedUsers.has(uidStr);
                    const hasMessaged = messagedUsers.has(uidStr);
                    
                    // Read more functionality for bio
                    const userId = user.userId || user.id;
                    const bioText = user.aboutMe || '';
                    const isBioExpanded = expandedBios[userId] || false;
                    const shouldTruncate = bioText.length > 80;
                    const displayBio = isBioExpanded ? bioText : (bioText.substring(0, 80) || '');
                    
                    return (
                      <div key={user.id} className="match-card">
                        <div className="match-card-content">
                          {/* Profile Image on Left - Clickable */}
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
                                  <span className="vip-text">VIP</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Content in Middle */}
                          <div className="match-card-middle">
                            <div className="match-name-row">
                              <h3 
                                className="match-name"
                                onClick={() => handleProfileClick(user.userId || user.id)}
                                style={{ cursor: 'pointer' }}
                              >
                                {user.name || 'Anonymous'}
                              </h3>
                              {isVip && (
                                <img 
                                  src="/images/verified.png" 
                                  alt="Verified" 
                                  className="verified-badge-img"
                                />
                              )}
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
                              {bioText ? (
                                <>
                                  {displayBio}
                                  {shouldTruncate && (
                                    <span 
                                      className="more-link" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedBios(prev => ({
                                          ...prev,
                                          [userId]: !isBioExpanded
                                        }));
                                      }}
                                    >
                                      {isBioExpanded ? ' less' : ' more'}
                                    </span>
                                  )}
                                </>
                              ) : (
                                'No bio available'
                              )}
                            </div>
                          </div>

                          {/* Action Buttons on Right */}
                          <div className="match-card-actions">
                            <button 
                              className="action-btn reject-btn" 
                              onClick={(e) => handleBlockToggle(e, user.userId || user.id, user.name)}
                              title={isBlocked ? 'Unblock' : 'Block'}
                            >
                              <img 
                                src="/images/Reject.png" 
                                alt={isBlocked ? 'Unblock' : 'Block'} 
                                className={`action-icon ${isBlocked ? 'active' : 'inactive'}`} 
                              />
                            </button>
                            <button 
                              className="action-btn favorite-btn"
                              onClick={(e) => handleFavoriteToggle(e, user.userId || user.id)}
                              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <img 
                                src={isFavorited ? '/images/Heart_like.png' : '/images/Heart_unlike.png'} 
                                alt={isFavorited ? 'Favorited' : 'Favorite'} 
                                className={`action-icon ${isFavorited ? 'active' : 'inactive'}`} 
                              />
                            </button>
                            <button 
                              className="action-btn superlike-btn" 
                              onClick={(e) => handleSuperlike(e, user.userId || user.id)}
                              title="Shortlist">
                              <img 
                                src="/images/Star.png" 
                                alt="Shortlist" 
                                className={`action-icon ${isShortlisted ? 'active' : 'inactive'}`} 
                              />
                            </button>
                            <button 
                              className="action-btn message-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/chat/${user.userId || user.id}`);
                              }}
                              title="Message">
                              <img 
                                src="/images/Chat.png" 
                                alt="Message" 
                                className={`action-icon ${hasMessaged ? 'active' : 'inactive'}`} 
                              />
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

      {/* Block Confirmation Dialog */}
      {showBlockConfirm && (
        <div className="block-confirm-overlay" onClick={() => setShowBlockConfirm(false)}>
          <div className="block-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="block-confirm-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#FF2B45"/>
              </svg>
            </div>
            <div className="block-confirm-content">
              <p className="block-confirm-title">Do you want to block</p>
              <p className="block-confirm-name">{userToBlock?.userName || 'this user'}?</p>
              <p className="block-confirm-description">
                You won't be able to send or receive messages from this user. You can unblock them anytime.
              </p>
            </div>
            <div className="block-confirm-actions">
              <button 
                className="block-confirm-cancel"
                onClick={() => {
                  setShowBlockConfirm(false);
                  setUserToBlock(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="block-confirm-block"
                onClick={confirmBlock}
              >
                Block
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