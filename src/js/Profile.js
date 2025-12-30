import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profileInformation');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
              docId: userDoc.id,
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

  const calculateProfileCompleteness = () => {
    if (!userData) return 0;
    
    const fields = [
      'name', 'dateOfBirth', 'userGender', 'religion', 'community',
      'motherTongue', 'status', 'height', 'dayJob', 'aboutMe',
      'settledCountry', 'profileImageUrls'
    ];
    
    const completedFields = fields.filter(field => {
      if (field === 'profileImageUrls') {
        return userData[field] && userData[field].length > 0;
      }
      return userData[field] && userData[field] !== '';
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
  };

  const onboardingSteps = [
    { key: 'profileInformation', label: 'Profile information', completed: true },
    { key: 'profilePhoto', label: 'Profile Photo', completed: true },
    { key: 'personalDetails', label: 'Personal details', completed: true },
    { key: 'hobbiesInterests', label: 'Hobbies and interests', completed: false },
    { key: 'familyDetails', label: 'Family details', completed: false },
    { key: 'education', label: 'Education & Career', completed: false },
    { key: 'lifestyle', label: 'Lifestyle', completed: false },
    { key: 'preferences', label: 'Partner Preferences', completed: false },
    { key: 'verification', label: 'Verification', completed: false },
    { key: 'privacy', label: 'Privacy Settings', completed: false },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profileInformation':
        return (
          <div className="section-content">
            <h2>Profile Information</h2>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={userData?.name || ''} className="form-input" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={userData?.email || ''} className="form-input" disabled />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" value={userData?.phoneNumber || ''} className="form-input" />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" value={userData?.dateOfBirth || ''} className="form-input" />
            </div>
            <button className="save-btn">Save Changes</button>
          </div>
        );
      
      case 'profilePhoto':
        return (
          <div className="section-content">
            <h2>Profile Photo</h2>
            <div className="photo-upload-section">
              <div className="current-photos">
                {userData?.profileImageUrls?.map((url, index) => (
                  <div key={index} className="photo-item">
                    <img src={url} alt={`Profile ${index + 1}`} />
                  </div>
                ))}
              </div>
              <button className="upload-btn">Upload New Photo</button>
            </div>
          </div>
        );
      
      case 'personalDetails':
        return (
          <div className="section-content">
            <h2>Personal Details</h2>
            <div className="form-group">
              <label>Height</label>
              <input type="text" value={userData?.height || ''} className="form-input" />
            </div>
            <div className="form-group">
              <label>Marital Status</label>
              <select value={userData?.status || ''} className="form-input">
                <option value="single">Single / Never Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div className="form-group">
              <label>Religion</label>
              <input type="text" value={userData?.religion || ''} className="form-input" />
            </div>
            <div className="form-group">
              <label>Community</label>
              <input type="text" value={userData?.community || ''} className="form-input" />
            </div>
            <div className="form-group">
              <label>Mother Tongue</label>
              <input type="text" value={userData?.motherTongue || ''} className="form-input" />
            </div>
            <button className="save-btn">Save Changes</button>
          </div>
        );
      
      case 'hobbiesInterests':
        return (
          <div className="section-content">
            <h2>Hobbies and Interests</h2>
            <div className="form-group">
              <label>Hobbies</label>
              <textarea className="form-textarea" rows="4" placeholder="Tell us about your hobbies..."></textarea>
            </div>
            <div className="form-group">
              <label>Interests</label>
              <textarea className="form-textarea" rows="4" placeholder="What are you interested in?"></textarea>
            </div>
            <button className="save-btn">Save Changes</button>
          </div>
        );
      
      default:
        return (
          <div className="section-content">
            <h2>{activeSection}</h2>
            <p>Content for {activeSection} section will be added here.</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <img src="/images/logo.png" alt="Ybe Logo" className="loading-logo" />
      </div>
    );
  }

  const profileCompleteness = calculateProfileCompleteness();

  return (
    <div className="profile-container">
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
          <button className="icon-btn" onClick={() => navigate('/profile')}>
            <img src="/images/profile.png" alt="Profile" className="profile-icon-img" />
          </button>
        </div>
      </header>

      <div className="profile-content">
        {/* Left Sidebar */}
        <aside className="profile-sidebar">
          <h2 className="sidebar-title">Profile settings</h2>
          
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-header-info">
              <img 
                src={userData?.profileImageUrls?.[0] || '/images/profile_badge.png'} 
                alt="Profile" 
                className="profile-avatar"
              />
              <div className="profile-welcome">
                <p className="welcome-text">Welcome back,</p>
                <h3 className="profile-name">{userData?.name || 'User'}</h3>
                <p className="profile-id">xxxxxxx</p>
              </div>
            </div>
            
            <div className="profile-completeness">
              <p className="completeness-label">Profile Completeness</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${profileCompleteness}%` }}
                ></div>
              </div>
              <p className="completeness-message">Complete your profile to get a perfect match</p>
            </div>
          </div>

          {/* Onboarding Progress */}
          <div className="onboarding-section">
            <h3 className="onboarding-title">Onboarding Progress</h3>
            <div className="onboarding-steps">
              {onboardingSteps.map((step) => (
                <div 
                  key={step.key}
                  className={`onboarding-step ${activeSection === step.key ? 'active' : ''}`}
                  onClick={() => setActiveSection(step.key)}
                >
                  <div className={`step-checkbox ${step.completed ? 'completed' : ''}`}>
                    {step.completed && '✓'}
                  </div>
                  <span className="step-label">{step.label}</span>
                  <span className="step-arrow">›</span>
                </div>
              ))}
            </div>
          </div>

          {/* Logout Button */}
          <button 
            className="logout-btn"
            onClick={() => setShowLogoutModal(true)}
          >
            Logout
          </button>
        </aside>

        {/* Main Content */}
        <main className="profile-main">
          {renderSectionContent()}
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