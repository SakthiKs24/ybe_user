import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/ProfileDetails.css';

export default function ProfileDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  return (
    <div className="profile-details-container">
      {/* Header */}
      <header className="profile-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Ybe Logo" className="header-logo" />
          <nav className="header-nav">
            <a href="/dashboard" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Matches</a>
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
          
          <button className="icon-btn">
            <img src="/images/profile.png" alt="Profile" className="profile-icon-img" />
          </button>
        </div>
      </header>

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
        ProfileDetails

        </button>

        <div className="profile1-main">
          {/* Left Side - Image Gallery */}
          <div className="profile-left">
            <div className="image-gallery">
              <div className="main-image-container">
                <img 
                  src={profileImages[currentImageIndex]} 
                  alt={userData.name || 'User'} 
                  className="main-profile-image" 
                />
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
            {/* Basic Info */}
            <section className="info-section">
              <h2 className="section-title">Basic Info</h2>
              <div className="info-grid">
                <InfoRow label="Age/Height" value={`${age} Yrs /${height}`} icon="✕" />
                <InfoRow label="Date of Birth" value={formatDate(userData.dateOfBirth)} />
                <InfoRow label="Gender" value={userData.userGender === 'Female' ? 'Female' : userData.userGender === 'male' ? 'Male' : 'Not Specified'} icon="✕" />
                <InfoRow label="Marital Status" value={userData.status === 'single' ? 'Never Married' : userData.status || 'Not Specified'} icon="❤" />
                <InfoRow label="Have Children" value={userData.hasChildren || 'No information Available'} icon="⭐" />
                <InfoRow label="Religion" value={userData.religion || 'Not Specified'} icon="✓" />
                <InfoRow label="Caste" value={userData.community || 'Not Specified'} />
                <InfoRow label="Sub Caste" value={userData.subCaste || 'Not Specified'} />
                <InfoRow label="Gothra" value={userData.gothra || 'Not Specified'} />
                <InfoRow label="Mother Tongue" value={userData.motherTongue || 'Not Specified'} />
                <InfoRow label="Features" value={userData.bodyBuild || 'Not Specified'} />
                <InfoRow label="Complexion" value={userData.complexion || 'Not Specified'} />
                <InfoRow label="Special Cases" value={userData.specialCases || 'None'} />
              </div>
            </section>

            {/* Background and Religion Details */}
            <section className="info-section">
              <h2 className="section-title">Background and Religion Details</h2>
              <div className="info-grid">
                <InfoRow label="Birth Time" value={userData.birthTime || 'Not Specified'} />
                <InfoRow label="Country of Birth" value={userData.countryOfBirth || 'Not Specified'} />
                <InfoRow label="Star" value={userData.selectedPersonalityTraitsMap.starSign || "Don't Know"} />
             
              </div>
            </section>

            {/* Location */}
            <section className="info-section">
              <h2 className="section-title">Location</h2>
              <div className="info-grid">
                <InfoRow label="Address" value={userData?.currentPosition?.address || 'Not Specified'} />
                <InfoRow label="City"  value={userData?.currentPosition?.city || 'Not Specified'} />
                <InfoRow label="Settled Country" value={userData.settledCountry || 'Not Specified'} />
                <InfoRow label="Origin Country" value={userData.originCountry || 'Not Specified'} />
                <InfoRow label="GrowUp Country" value={userData.growUpCountry || 'Not Specified'} />

              </div>
            </section>

            {/* Education and Profession */}
            <section className="info-section">
              <h2 className="section-title">Education and Profession</h2>
              <div className="info-grid">
                <InfoRow label="Degree" value={userData.degree || 'Not Specified'} />
                <InfoRow label="Day Job" value={userData.dayJob || 'Not Specified'} />
              </div>
            </section>
          </div>
        </div>
      </div>
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