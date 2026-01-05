import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';
import '../css/Profile.css';
import { COUNTRIES_DATA } from '../js/countriesData';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profileInformation');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form data state for editing
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    userGender: '',
    genderPreference: '',
    height: '',
    religion: '',
    community: '',
    motherTongue: '',
    status: '',
    dayJob: '',
    degree: '',
    aboutMe: '',
    settledCountry: '',
    originCountry: '',
    growUpCountry: '',
    bodyBuild: '',
    createdFor: '',
    lookingFor: ''
  });

  // Height options
  const heightOptions = [];
  for (let ft = 4; ft <= 7; ft++) {
    for (let inch = 0; inch <= 11; inch++) {
      if (ft === 7 && inch > 0) break;
      heightOptions.push({ value: `${ft}.${inch}`, label: `${ft}'${inch}"` });
    }
  }

  // Mother tongue options
  const motherTongues = [
    "العربية", "বাংলা", "中文", "Dansk", "Deutsch", "English", "Español", "Français", 
    "Gaeilge", "Italiano", "日本語", "कश्मीरी/ كشميري", "ಕನ್ನಡ", "कोंकणी", 
    "মৈতৈলোন্/ মণিপুরী", "मराठी", "Magyar", "മലയാളം", "नेपाली", "Nederlands", 
    "ଓଡିଆ", "ਪੰਜਾਬੀ", "Português", "Русский", "سنڌي", "Svenska", "தமிழ்", 
    "తెలుగు", "ತುಳು", "اردو", "ગુજરાતી"
  ];

  // Countries
  const countries = [
    "Abu Dhabi", "Ahmedabad", "Auckland", "Bangkok", "Barcelona", "Berlin", 
    "Bengaluru", "Cape Town", "Calicut", "Chennai", "Chicago", "Cochin", 
    "Delhi", "Doha", "Dubai", "Frankfurt", "Hong Kong", "Houston", "Jedah", 
    "Jaipur", "Johannesburg", "India", "Kuala Lumpur", "Kuwait City", "Lisbon", 
    "London", "Los Angeles", "Lucknow", "Madrid", "Melbourne", "Milan", 
    "Montreal", "Munich", "New York", "Ottawa", "Paris", "Pune", "Riyadh", 
    "Rome", "San Francisco", "Seoul", "Shanghai", "Singapore", "Sydney", 
    "Tokyo", "Toronto", "Trivandrum", "Vancouver", "Zurich"
  ];

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
            const data = {
              uid: user.uid,
              docId: userDoc.id,
              email: user.email,
              ...userDoc.data()
            };
            setUserData(data);
            
            // Set form data for editing
            setFormData({
              name: data.name || '',
              email: data.email || '',
              phoneNumber: data.phoneNumber || '',
              dateOfBirth: data.dateOfBirth || '',
              userGender: data.userGender || '',
              genderPreference: data.genderPreference || '',
              height: data.height || '',
              religion: data.religion || '',
              community: data.community || '',
              motherTongue: data.motherTongue || '',
              status: data.status || '',
              dayJob: data.dayJob || '',
              degree: data.degree || '',
              aboutMe: data.aboutMe || '',
              settledCountry: data.settledCountry || '',
              originCountry: data.originCountry || '',
              growUpCountry: data.growUpCountry || '',
              bodyBuild: data.bodyBuild || '',
              createdFor: data.createdFor || '',
              lookingFor: data.lookingFor || ''
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error('Failed to load profile data');
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    setSaveLoading(true);
    try {
      const userDocRef = doc(db, 'users', userData.docId);
      
      const updateData = {};
      
      // Only update fields based on active section
      if (activeSection === 'profileInformation') {
        updateData.name = formData.name;
        updateData.phoneNumber = formData.phoneNumber;
        updateData.dateOfBirth = formData.dateOfBirth;
      } else if (activeSection === 'personalDetails') {
        updateData.height = formData.height;
        updateData.status = formData.status;
        updateData.religion = formData.religion;
        updateData.community = formData.community;
        updateData.motherTongue = formData.motherTongue;
      } else if (activeSection === 'education') {
        updateData.degree = formData.degree;
        updateData.dayJob = formData.dayJob;
      } else if (activeSection === 'location') {
        updateData.originCountry = formData.originCountry;
        updateData.settledCountry = formData.settledCountry;
        updateData.growUpCountry = formData.growUpCountry;
      } else if (activeSection === 'aboutMe') {
        updateData.aboutMe = formData.aboutMe;
      } else if (activeSection === 'preferences') {
        updateData.createdFor = formData.createdFor;
        updateData.lookingFor = formData.lookingFor;
        updateData.genderPreference = formData.genderPreference;
      } else if (activeSection === 'lifestyle') {
        updateData.bodyBuild = formData.bodyBuild;
      }

      updateData.updatedAt = new Date();

      await updateDoc(userDocRef, updateData);

      // Update local state
      setUserData(prev => ({ ...prev, ...updateData }));
      
      toast.success('Profile updated successfully!', {
        position: "top-right",
        autoClose: 2000,
      });
      
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePhotoUpload = async (event, index) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setLoading(true);
        
        const storage = getStorage();
        const fileName = `${userData.docId}_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `profile-images/${fileName}`);

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        // Update profileImageUrls array
        const newUrls = [...(userData.profileImageUrls || [])];
        newUrls[index] = downloadURL;

        const userDocRef = doc(db, 'users', userData.docId);
        await updateDoc(userDocRef, {
          profileImageUrls: newUrls,
          updatedAt: new Date()
        });

        setUserData(prev => ({
          ...prev,
          profileImageUrls: newUrls
        }));

        toast.success('Photo uploaded successfully!');
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error('Failed to upload photo. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (userData && userData.uid) {
        try {
          const userDocRef = doc(db, 'users', userData.docId);
          await updateDoc(userDocRef, {
            onlineStatus: false
          });
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
      'settledCountry', 'profileImageUrls', 'degree', 'originCountry',
      'genderPreference', 'bodyBuild', 'lookingFor'
    ];
    
    const completedFields = fields.filter(field => {
      if (field === 'profileImageUrls') {
        return userData[field] && userData[field].length >= 3;
      }
      return userData[field] && userData[field] !== '';
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
  };

  const onboardingSteps = [
    { key: 'profileInformation', label: 'Profile Information', completed: !!(userData?.name && userData?.dateOfBirth) },
    { key: 'profilePhoto', label: 'Profile Photos', completed: !!(userData?.profileImageUrls && userData.profileImageUrls.length >= 3) },
    { key: 'personalDetails', label: 'Personal Details', completed: !!(userData?.height && userData?.religion && userData?.community) },
    { key: 'aboutMe', label: 'About Me', completed: !!(userData?.aboutMe) },
    { key: 'preferences', label: 'Preferences', completed: !!(userData?.genderPreference && userData?.lookingFor) },
    { key: 'location', label: 'Location Details', completed: !!(userData?.settledCountry) },
    { key: 'education', label: 'Education & Career', completed: !!(userData?.degree && userData?.dayJob) },
    { key: 'lifestyle', label: 'Lifestyle', completed: !!(userData?.bodyBuild) },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profileInformation':
        return (
          <div className="section-content">
            <div className="section-header">
              <h2>Profile Information</h2>
              {!editMode && (
                <button className="edit-btn" onClick={() => setEditMode(true)}>
                  ✏️ Edit
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={editMode ? formData.name : userData?.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="form-input"
                disabled={!editMode}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={userData?.email || ''}
                className="form-input"
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                value={editMode ? formData.phoneNumber : userData?.phoneNumber || ''}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                className="form-input"
                disabled={!editMode}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                value={editMode ? formData.dateOfBirth : userData?.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="form-input"
                disabled={!editMode}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <input
                type="text"
                value={userData?.userGender || ''}
                className="form-input"
                disabled
              />
            </div>

            {editMode && (
              <div className="btn-group">
                <button className="btn-cancel" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={handleSaveChanges}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        );
      
      case 'profilePhoto':
        return (
          <div className="section-content">
            <h2>Profile Photos</h2>
            <p className="subtitle">Upload at least 3 photos to complete your profile</p>
            
            <div className="photo-upload-section">
              <div className="current-photos">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div key={index} className="photo-item">
                    {userData?.profileImageUrls?.[index] ? (
                      <img src={userData.profileImageUrls[index]} alt={`Profile ${index + 1}`} />
                    ) : (
                      <div className="photo-placeholder">+</div>
                    )}
                    <input
                      type="file"
                      id={`photo-${index}`}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handlePhotoUpload(e, index)}
                    />
                    <button
                      className="upload-btn-small"
                      onClick={() => document.getElementById(`photo-${index}`).click()}
                    >
                      {userData?.profileImageUrls?.[index] ? 'Change' : 'Upload'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'personalDetails':
        return (
          <div className="section-content">
            <div className="section-header">
              <h2>Personal Details</h2>
              {!editMode && (
                <button className="edit-btn" onClick={() => setEditMode(true)}>
                  ✏️ Edit
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Height</label>
              <select
                value={editMode ? formData.height : userData?.height || ''}
                onChange={(e) => handleChange('height', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Height</option>
                {heightOptions.map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Marital Status</label>
              <select
                value={editMode ? formData.status : userData?.status || ''}
                onChange={(e) => handleChange('status', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Status</option>
                <option value="single">Single / Never Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="separated">Separated</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Religion</label>
              <select
                value={editMode ? formData.religion : userData?.religion || ''}
                onChange={(e) => handleChange('religion', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Religion</option>
                <option value="Hindu">Hindu</option>
                <option value="Muslim">Muslim</option>
                <option value="Christian">Christian</option>
                <option value="Sikh">Sikh</option>
                <option value="Jain">Jain</option>
                <option value="Buddhist">Buddhist</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Community</label>
              <select
                value={editMode ? formData.community : userData?.community || ''}
                onChange={(e) => handleChange('community', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Community</option>
                <option value="Malayali">Malayali</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
                <option value="Kannada">Kannada</option>
                <option value="Punjabi">Punjabi</option>
                <option value="Bengali">Bengali</option>
                <option value="Gujarati">Gujarati</option>
                <option value="Marathi">Marathi</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mother Tongue</label>
              <select
                value={editMode ? formData.motherTongue : userData?.motherTongue || ''}
                onChange={(e) => handleChange('motherTongue', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Mother Tongue</option>
                {motherTongues.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {editMode && (
              <div className="btn-group">
                <button className="btn-cancel" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={handleSaveChanges}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        );

      case 'education':
        return (
          <div className="section-content">
            <div className="section-header">
              <h2>Education & Career</h2>
              {!editMode && (
                <button className="edit-btn" onClick={() => setEditMode(true)}>
                  ✏️ Edit
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Highest Education</label>
              <select
                value={editMode ? formData.degree : userData?.degree || ''}
                onChange={(e) => handleChange('degree', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Degree</option>
                <option value="Doctorate">Doctorate</option>
                <option value="PhD">PhD</option>
                <option value="Masters">Masters</option>
                <option value="Bachelors">Bachelors</option>
                <option value="High School">High School</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Day Job</label>
              <select
                value={editMode ? formData.dayJob : userData?.dayJob || ''}
                onChange={(e) => handleChange('dayJob', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Day Job</option>
                <option value="Doctor">Doctor</option>
                <option value="Engineer">Engineer</option>
                <option value="Teacher">Teacher</option>
                <option value="Business owner">Business owner</option>
                <option value="IT Professional">IT Professional</option>
              </select>
            </div>

            {editMode && (
              <div className="btn-group">
                <button className="btn-cancel" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={handleSaveChanges}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        );

      case 'location':
        return (
          <div className="section-content">
            <div className="section-header">
              <h2>Location Details</h2>
              {!editMode && (
                <button className="edit-btn" onClick={() => setEditMode(true)}>
                  ✏️ Edit
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Origin Country</label>
              <select
                value={editMode ? formData.originCountry : userData?.originCountry || ''}
                onChange={(e) => handleChange('originCountry', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Origin Country</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Settled Country</label>
              <select
                value={editMode ? formData.settledCountry : userData?.settledCountry || ''}
                onChange={(e) => handleChange('settledCountry', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Settled Country</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Grow Up Country</label>
              <select
                value={editMode ? formData.growUpCountry : userData?.growUpCountry || ''}
                onChange={(e) => handleChange('growUpCountry', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Grow Up Country</option>
                <option value="USA">USA</option>
                <option value="Canada">Canada</option>
                <option value="India">India</option>
                <option value="UK">UK</option>
              </select>
            </div>

            {editMode && (
              <div className="btn-group">
                <button className="btn-cancel" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={handleSaveChanges}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        );

      case 'aboutMe':
        return (
          <div className="section-content">
            <div className="section-header">
              <h2>About Me</h2>
              {!editMode && (
                <button className="edit-btn" onClick={() => setEditMode(true)}>
                  ✏️ Edit
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Tell us about yourself</label>
              <textarea
                className="form-textarea"
                rows="6"
                value={editMode ? formData.aboutMe : userData?.aboutMe || ''}
                onChange={(e) => handleChange('aboutMe', e.target.value)}
                placeholder="Share something about yourself..."
                disabled={!editMode}
              />
            </div>

            {editMode && (
              <div className="btn-group">
                <button className="btn-cancel" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={handleSaveChanges}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        );

      case 'preferences':
        return (
          <div className="section-content">
            <div className="section-header">
              <h2>Preferences</h2>
              {!editMode && (
                <button className="edit-btn" onClick={() => setEditMode(true)}>
                  ✏️ Edit
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Profile Created For</label>
              <select
                value={editMode ? formData.createdFor : userData?.createdFor || ''}
                onChange={(e) => handleChange('createdFor', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select</option>
                <option value="Myself">Myself</option>
                <option value="Parents">Parents</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Friend">Friend</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Looking For</label>
              <select
                value={editMode ? formData.lookingFor : userData?.lookingFor || ''}
                onChange={(e) => handleChange('lookingFor', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select</option>
                <option value="Dating">Dating</option>
                <option value="Marriage">Marriage</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Gender Preference</label>
              <select
                value={editMode ? formData.genderPreference : userData?.genderPreference || ''}
                onChange={(e) => handleChange('genderPreference', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Preference</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Everyone">Everyone</option>
              </select>
            </div>

            {editMode && (
              <div className="btn-group">
                <button className="btn-cancel" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={handleSaveChanges}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        );

      case 'lifestyle':
        return (
          <div className="section-content">
            <div className="section-header">
              <h2>Lifestyle</h2>
              {!editMode && (
                <button className="edit-btn" onClick={() => setEditMode(true)}>
                  ✏️ Edit
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Body Build</label>
              <select
                value={editMode ? formData.bodyBuild : userData?.bodyBuild || ''}
                onChange={(e) => handleChange('bodyBuild', e.target.value)}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Body Build</option>
                <option value="Slim/Lean">Slim/Lean</option>
                <option value="Athletic/Toned">Athletic/Toned</option>
                <option value="Average/Medium Build">Average/Medium Build</option>
                <option value="Muscular">Muscular</option>
                <option value="Plus-Size">Plus-Size</option>
              </select>
            </div>

            {editMode && (
              <div className="btn-group">
                <button className="btn-cancel" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={handleSaveChanges}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="section-content">
            <h2>{activeSection}</h2>
            <p>Content for {activeSection} section.</p>
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
                <p className="profile-id">{userData?.userId || ''}</p>
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
              <p className="completeness-message">
                {profileCompleteness === 100 
                  ? 'Your profile is complete! 🎉' 
                  : 'Complete your profile to get a perfect match'}
              </p>
            </div>
          </div>

          {/* Onboarding Progress */}
          <div className="onboarding-section">
            <h3 className="onboarding-title">Profile Sections</h3>
            <div className="onboarding-steps">
              {onboardingSteps.map((step) => (
                <div 
                  key={step.key}
                  className={`onboarding-step ${activeSection === step.key ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSection(step.key);
                    setEditMode(false);
                  }}
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