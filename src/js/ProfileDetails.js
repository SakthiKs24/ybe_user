import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, setDoc, updateDoc, doc, documentId } from 'firebase/firestore';
import { toast } from 'react-toastify';
import Header from './Header';
import '../css/ProfileDetails.css';

export default function ProfileDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [favorites, setFavorites] = useState(new Set());
  const [blockedUsers, setBlockedUsers] = useState(new Set());
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [userToBlock, setUserToBlock] = useState(null);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [hasMessaged, setHasMessaged] = useState(false);

  // Fetch current logged-in user data for header
  useEffect(() => {
    const fetchCurrentUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', currentUser.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setCurrentUserData({
              id: userDoc.id,
              uid: currentUser.uid,
              ...userDoc.data()
            });
          }
        }
      } catch (error) {
        console.error('Error fetching current user data:', error);
      }
    };

    fetchCurrentUserData();
  }, []);

  // Load current user's favorites and block list
  useEffect(() => {
    const loadUserRelations = async () => {
      try {
        if (!currentUserData) return;
        // Favorites
        const favRef = collection(db, 'favorites');
        const favQ = query(favRef, where('likedBy', '==', currentUserData.userId || currentUserData.id));
        const favSnap = await getDocs(favQ);
        const favSet = new Set();
        favSnap.forEach(d => favSet.add(d.data().likedUser));
        setFavorites(favSet);
        // Blocked
        const blockRef = collection(db, 'block');
        const blockQ = query(blockRef, where(documentId(), '==', currentUserData.uid || currentUserData.id));
        const blockSnap = await getDocs(blockQ);
        if (!blockSnap.empty) {
          const data = blockSnap.docs[0].data();
          const blockedBy = data.blockedBy || [];
          setBlockedUsers(new Set(blockedBy));
        }
      } catch (e) {
        console.error('Failed loading relations', e);
      }
    };
    loadUserRelations();
  }, [currentUserData]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          setUserData({
            id: userDoc.id,
            ...userDoc.data()
          });
        } else {
          toast.error('User not found');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId, navigate]);

  // Derive shortlist and message states for this profile
  useEffect(() => {
    const deriveStates = async () => {
      try {
        if (!currentUserData?.userId || !userData?.userId && !userData?.id) return;
        const targetId = userData.userId || userData.id;
        // Check shortlist
        const shortlistRef = collection(db, 'shortlist');
        const qS = query(shortlistRef, where('shortlistedBy', '==', currentUserData.userId), where('shortlistedUser', '==', targetId));
        const sSnap = await getDocs(qS);
        setIsShortlisted(!sSnap.empty);
        // Check existing chat
        const chatsRef = collection(db, 'chats');
        let qChats;
        try {
          // array-contained-in is not widely available; fallback below covers
          qChats = query(chatsRef, where('chatUserData.participants', 'array-contains', currentUserData.userId));
        } catch (_) {
          qChats = query(chatsRef, where('chatUserData.participants', 'array-contains', currentUserData.userId));
        }
        const cSnap = await getDocs(qChats);
        let exists = false;
        cSnap.forEach(docSnap => {
          const data = docSnap.data() || {};
          const parts = (data.chatUserData && data.chatUserData.participants) || data.participants || [];
          if (Array.isArray(parts) && parts.some(p => String(p) === String(targetId))) {
            exists = true;
          }
        });
        setHasMessaged(exists);
      } catch (e) {
        // Non-blocking
        console.warn('deriveStates failed', e);
      }
    };
    deriveStates();
  }, [currentUserData, userData]);

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
    if (!height) return 'Not Specified';
    if (height.includes("'")) return height;
    const [ft, inch] = height.split('.');
    return `${ft}'${inch || '0'}"`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not Specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const nextImage = () => {
    if (userData?.profileImageUrls && userData.profileImageUrls.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === userData.profileImageUrls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (userData?.profileImageUrls && userData.profileImageUrls.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? userData.profileImageUrls.length - 1 : prev - 1
      );
    }
  };

  const getRelativePosition = (index) => {
    const total = (userData?.profileImageUrls || []).length;
    if (total === 0) return 0;
    let diff = index - currentImageIndex;
    // Wrap around shortest direction
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff; // negative = left, positive = right
  };

  const generateRandomId = () => Math.random().toString(36).substring(2, 10).toUpperCase();

  const handleFavoriteToggle = async () => {
    try {
      if (!currentUserData?.userId) return;
      const targetId = userData.userId || userData.id;
      const isFavorite = favorites.has(targetId);
      if (isFavorite) {
        const favoritesRef = collection(db, 'favorites');
        const qFav = query(favoritesRef, where('likedBy', '==', currentUserData.userId), where('likedUser', '==', targetId));
        const snap = await getDocs(qFav);
        snap.forEach(async (ds) => {
          await deleteDoc(doc(db, 'favorites', ds.id));
        });
        setFavorites(prev => {
          const s = new Set(prev);
          s.delete(targetId);
          return s;
        });
        toast.success('Removed from favorites');
      } else {
        await addDoc(collection(db, 'favorites'), {
          likedBy: currentUserData.userId,
          likedUser: targetId,
        });
        setFavorites(prev => new Set(prev).add(targetId));
        toast.success('Added to favorites');
      }
    } catch (e) {
      console.error('favorite toggle failed', e);
      toast.error('Failed to update favorites');
    }
  };

  const handleShortlistToggle = async () => {
    try {
      if (!currentUserData?.userId) return;
      const targetId = userData.userId || userData.id;
      const shortlistRef = collection(db, 'shortlist');
      const qS = query(shortlistRef, where('shortlistedBy', '==', currentUserData.userId), where('shortlistedUser', '==', targetId));
      const snap = await getDocs(qS);
      if (!snap.empty) {
        snap.forEach(async (ds) => {
          await deleteDoc(doc(db, 'shortlist', ds.id));
        });
        toast.success('Shortlist removed!');
        setIsShortlisted(false);
      } else {
        const customDocId = `${currentUserData.userId}-${generateRandomId()}`;
        const dref = doc(collection(db, 'shortlist'), customDocId);
        await setDoc(dref, {
          shortlistedBy: currentUserData.userId,
          shortlistedUser: targetId,
        });
        toast.success('User shortlisted!');
        setIsShortlisted(true);
      }
    } catch (e) {
      console.error('shortlist toggle failed', e);
      toast.error('Failed to update shortlist');
    }
  };

  const handleBlockToggle = async () => {
    try {
      if (!currentUserData?.uid) return;
      const targetId = userData.userId || userData.id;
      const isBlocked = blockedUsers.has(targetId);
      if (isBlocked) {
        // Unblock directly
        const blockRef = collection(db, 'block');
        const blockDocRef = doc(blockRef, currentUserData.uid);
        const blockQ = query(blockRef, where(documentId(), '==', currentUserData.uid));
        const blockSnap = await getDocs(blockQ);
        if (!blockSnap.empty) {
          const currentData = blockSnap.docs[0].data();
          const updated = (currentData.blockedBy || []).filter(id => id !== targetId);
          await updateDoc(blockDocRef, { blockedBy: updated });
        }
        setBlockedUsers(prev => {
          const s = new Set(prev);
          s.delete(targetId);
          return s;
        });
        toast.success('User unblocked');
      } else {
        // Ask confirmation
        setUserToBlock({ userId: targetId, userName: userData.name || 'this user' });
        setShowBlockConfirm(true);
      }
    } catch (e) {
      console.error('block toggle failed', e);
      toast.error('Failed to update block');
    }
  };

  const confirmBlock = async () => {
    try {
      if (!currentUserData?.uid || !userToBlock) return;
      const targetId = userToBlock.userId;
      const blockRef = collection(db, 'block');
      const blockDocRef = doc(blockRef, currentUserData.uid);
      const blockQ = query(blockRef, where(documentId(), '==', currentUserData.uid));
      const blockSnap = await getDocs(blockQ);
      if (blockSnap.empty) {
        await setDoc(blockDocRef, { blockedBy: [targetId] });
      } else {
        const currentData = blockSnap.docs[0].data();
        const updated = [...(currentData.blockedBy || []), targetId];
        await updateDoc(blockDocRef, { blockedBy: updated });
      }
      setBlockedUsers(prev => new Set(prev).add(targetId));
      toast.success('Blocked this user');
      setShowBlockConfirm(false);
      setUserToBlock(null);
    } catch (e) {
      console.error('confirm block failed', e);
      toast.error('Failed to block user');
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <img src="/images/logo.png" alt="Loading" className="loading-logo" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="profile-error">
        <p>User not found</p>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  const age = userData.age || calculateAge(userData.dateOfBirth) || 'N/A';
  const height = formatHeight(userData.height);
  const profileImages = userData.profileImageUrls || ['/images/profile_badge.png'];
  const isFavorited = favorites.has(userData.userId || userData.id);
  const isBlocked = blockedUsers.has(userData.userId || userData.id);

  return (
    <div className="profile-details-container">
      <Header 
        userData={currentUserData}
        showProfileDropdown={showProfileDropdown}
        setShowProfileDropdown={setShowProfileDropdown}
        dropdownRef={dropdownRef}
        currentPage="profileDetails"
      />

      <div className="">
        {/* Back Button */}
        <button className="back-button" >
        <span className="back-arrow" >
          <img
            src="/images/back_arrow.png"
            alt="Back"
            className="back-arrow-icon" onClick={() => navigate('/dashboard')}
          />
        </span>
        Profile Details

        </button>

        <div className="profile1-main">
          {/* Left Side - Image Gallery */}
          <div className="profile-left">
            <div className="image-gallery">
              <div className="coverflow">
                {profileImages.map((img, idx) => {
                  const pos = getRelativePosition(idx);
                  let cls = 'cf-hidden';
                  if (pos === 0) cls = 'cf-current';
                  else if (pos === -1) cls = 'cf-left';
                  else if (pos === -2) cls = 'cf-left2';
                  else if (pos === 1) cls = 'cf-right';
                  else if (pos === 2) cls = 'cf-right2';
                  return (
                    <img
                      key={idx}
                      src={img}
                      alt={`${userData.name || 'User'} ${idx + 1}`}
                      className={`coverflow-item ${cls}`}
                      onClick={() => setCurrentImageIndex(idx)}
                    />
                  );
                })}
                {profileImages.length > 1 && (
                  <>
                    <button className="image-nav-btn prev-btn" onClick={prevImage}>‹</button>
                    <button className="image-nav-btn next-btn" onClick={nextImage}>›</button>
                  </>
                )}
              </div>
              {/* Thumbnail Gallery */}
              {profileImages.length > 1 && (
                <div className="thumbnail-gallery">
                  {profileImages.map((image, index) => (
                    <div 
                      key={index} 
                      className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img src={image} alt={`${userData.name} ${index + 1}`} />
                    </div>
                  ))}
                </div>
              )}
              
              <div className="image-dots">
                {profileImages.map((_, index) => (
                  <span 
                    key={index} 
                    className={`dot ${index === currentImageIndex ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - User Details */}
          <div className="profile-right">
            {/* Action buttons aligned right */}
            <div className="profile-actions-right">
              <button 
                className="action-btn reject-btn" 
                onClick={handleBlockToggle}
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
                onClick={handleFavoriteToggle}
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
                onClick={handleShortlistToggle}
                title="Shortlist">
                <img src="/images/Star.png" alt="Shortlist" className={`action-icon ${isShortlisted ? 'active' : 'inactive'}`} />
              </button>
              <button 
                className="action-btn message-btn"
                onClick={() => {
                  setHasMessaged(true);
                  navigate(`/chat/${userData.userId || userData.id}`);
                }}
                title="Message">
                <img src="/images/Chat.png" alt="Message" className={`action-icon ${hasMessaged ? 'active' : 'inactive'}`} />
              </button>
            </div>
            {/* About Me */}
            <section className="info-section">
              <h2 className="section-title">About Me</h2>
              <div className="info-grid">
                <InfoRow label="About Me" value={userData.aboutMe || 'Not Specified'} />
              </div>
            </section>

            {/* Basic Info */}
            <section className="info-section">
              <h2 className="section-title">Basic Info</h2>
              <div className="info-grid">
                <InfoRow label="Name" value={userData.name || 'Not Specified'} />
                <InfoRow label="Gender" value={userData.userGender || 'Not Specified'} />
                <InfoRow label="Interested In" value={userData.genderPreference || 'Not Specified'} />
                <InfoRow label="Looking For" value={userData.lookingFor || 'Not Specified'} />
                <InfoRow label="Status" value={userData.status || 'Not Specified'} />
                <InfoRow label="Age/Height" value={`${age} Yrs / ${height}`} />
                <InfoRow label="Mother Tongue" value={userData.motherTongue || 'Not Specified'} />
                <InfoRow label="Community" value={userData.community || 'Not Specified'} />
                <InfoRow label="Body Type" value={userData.bodyBuild || 'Not Specified'} />
              </div>
            </section>

            {/* Background and Religion Details */}
            <section className="info-section">
              <h2 className="section-title">Background and Religion Details</h2>
              <div className="info-grid">
                <InfoRow label="Birthday" value={formatDate(userData.dateOfBirth)} />
                <InfoRow label="Religion" value={userData.religion || 'Not Specified'} />
                <InfoRow label="Star Sign" value={userData.selectedPersonalityTraitsMap?.starSign || "Don't Know"} />
             
              </div>
            </section>

            {/* Location */}
            <section className="info-section">
              <h2 className="section-title">Location</h2>
              <div className="info-grid">
                <InfoRow label="Citizenship" value={userData.growUpCountry || 'Not Specified'} />
                <InfoRow label="Origin Country" value={userData.originCountry || 'Not Specified'} />
                <InfoRow label="Settled City" value={userData.settledCountry || 'Not Specified'} />

              </div>
            </section>

            {/* Education and Profession */}
            <section className="info-section">
              <h2 className="section-title">Education and Profession</h2>
              <div className="info-grid">
                <InfoRow label="Last Degree" value={userData.degree || 'Not Specified'} />
                <InfoRow label="Day Job" value={userData.dayJob || 'Not Specified'} />
              </div>
            </section>

            {/* Personality and Behaviour */}
            <section className="info-section">
              <h2 className="section-title">Personality and Behaviour</h2>
              <div className="info-grid">
                <InfoRow label="Smoking Habits" value={userData.selectedPersonalityTraitsMap?.smoke || 'Not Specified'} />
                <InfoRow label="Drinking Habits" value={userData.selectedPersonalityTraitsMap?.drink || 'Not Specified'} />
                <InfoRow label="Exercise" value={userData.selectedPersonalityTraitsMap?.exercise || 'Not Specified'} />
                <InfoRow label="Personality Type" value={userData.selectedPersonalityTraitsMap?.personalityType || 'Not Specified'} />
              </div>
            </section>

            {/* Passions */}
            <section className="info-section">
              <h2 className="section-title">Passions</h2>
              <div className="info-grid">
                <InfoRow
                  label="Passions"
                  value={
                    Array.isArray(userData.selectedPersonalityTraitsMap?.passions) &&
                    userData.selectedPersonalityTraitsMap.passions.length > 0
                      ? userData.selectedPersonalityTraitsMap.passions.join(', ')
                      : 'Not Specified'
                  }
                />
              </div>
            </section>
          </div>
        </div>
      </div>
      
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
    </div>
  );
}

// Helper component for info rows
function InfoRow({ label, value, icon }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">: {value}</span>
    </div>
  );
}
