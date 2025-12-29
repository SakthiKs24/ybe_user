import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/ProfileSetup.css';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedPhotos, setUploadedPhotos] = useState([false, false, false, false, false, false]);
  const [loading, setLoading] = useState(false);
  const totalSteps = 8;

  const [profileData, setProfileData] = useState({
    createdFor: 'Others',
    lookingFor: '',
    height: '',
    religion: '',
    motherTongue: '',
    originCountry: '',
    settledCountry: '',
    growUpCountry: '',
    degree: '',
    dayJob: '',
    maritalStatus: '',
    selectedLikesInvolvesMap: {
      books: [], childrenView: [], foods: [], hobbies: [], interests: [],
      movies: [], music: [], relaxWay: [], sleepingHabit: [], sports: [],
      tvShows: [], vacations: []
    },
    profileImageUrls: ['', '', ''],
    aboutMe: ''
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

  // Lifestyle data
  const lifestyleCategories = {
    movies: ["Action", "Adventure", "Romantic", "Comedies", "Thrillers", "Mysteries", 
             "Documentaries", "Fantasy", "Science fiction", "Horror", "supernatural"],
    music: ["Pop", "mainstream hits", "Rock", "Classical", "Instrumental", "Hip-hop", 
            "Rap", "R&B", "Jazz", "Blues", "EDM"],
    foods: ["Italian", "Mexican", "Asian", "Indian", "Mediterranean", "American"],
    books: ["Fiction", "Fantasy", "Adventure", "Romance", "Non-fiction", "Self-help", 
            "Biographies", "Mysteries", "Crime novels", "Science fiction", "Futuristic stories", 
            "Poetry", "Short stories", "I don't usually read books"],
    vacations: ["Beach vacations", "Hiking", "Outdoor adventures", "Exploring big cities and their culture", 
                "Exploring remote villages", "Historic buildings", "Museum", "Camping", "Theme parks", 
                "Cruising on a ship", "Staying at home for a staycation"],
    tvShows: ["Sitcoms", "Comedy shows", "Reality shows", "Competitions", "Crime dramas", 
              "Mysteries", "Sci-fi", "fantasy series", "News", "Current affairs", "Nature", 
              "Wildlife documentaries"],
    hobbies: ["Cooking", "Baking", "Painting", "Drawing", "Crafting", "Playing video games, Board games", 
              "Gardening", "Planting", "Musical instrument", "Writing stories", "Journaling"],
    sports: ["Football", "Basketball", "Tennis", "Baseball", "American Football", "Cricket", 
             "Rugby", "Hockey", "Golf", "Swimming", "Athletics ,Karate", "Judo", "Boxing", 
             "Volleyball", "Cycling", "Skateboarding", "Snowboarding", "Wrestling", "Table Tennis", 
             "Badminton", "Archery", "Gymnastics", "Sailing", "Windsurfing", "Rock Climbing", 
             "Mountaineering"],
    relaxWay: ["Reading a book", "Reading a magazine", "Watching movies", "watching TV", 
               "Long walk", "Exercising", "Meditating, Yoga", "Napping or sleeping", 
               "Talking to friends or family"],
    sleepingHabit: ["Early bed & Early wake up", "Late bed & Late Wake up", "Night owl", "It depends"],
    childrenView: ["Very much interested", "Not more than one", "No interest at all"],
    interests: ["Learning", "Investing", "Reading", "Meditation", "Mindfulness practices", 
                "Painting", "Drawing", "Sketching", "Writing poetry", "Writing stories", "Journaling", 
                "Photography", "Acting", "Theater", "Space exploration", "Astronomy", 
                "Artificial intelligence and robotics", "Environmental science and sustainability", 
                "Medical research", "Hiking", "Camping", "Nature exploration", "Yoga", "Pilates", 
                "Wellness exercises", "Sports", "Rock climbing", "Surfing", "Food", "Movies", 
                "TV shows", "Gaming", "Music", "Live concerts", "Collecting items", "Volunteering", 
                "Community service"]
  };

  const handleChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleLifestyleToggle = (category, option) => {
    setProfileData(prev => {
      const currentSelections = prev.selectedLikesInvolvesMap[category] || [];
      const isSelected = currentSelections.includes(option);
      
      return {
        ...prev,
        selectedLikesInvolvesMap: {
          ...prev.selectedLikesInvolvesMap,
          [category]: isSelected
            ? currentSelections.filter(item => item !== option)
            : [...currentSelections, option]
        }
      };
    });
  };

  const handlePhotoUpload = async (event, index) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setLoading(true);
        
        // Get current user
        const user = auth.currentUser;
        if (!user) {
          toast.error('User not authenticated');
          return;
        }
  
        // Query to find the user document by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
  
        if (querySnapshot.empty) {
          toast.error('User profile not found');
          return;
        }
  
        // Get the actual userId from the document
        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;
  
        // Create storage reference
        const storage = getStorage();
        const fileName = `${userId}_${file.name}`;
        const storageRef = ref(storage, `profile-images/${fileName}`);
  
        // Upload file
        await uploadBytes(storageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
  
        // Update state with the Firebase Storage URL
        setProfileData(prev => {
          const newUrls = [...prev.profileImageUrls];
          newUrls[index] = downloadURL;
          return { ...prev, profileImageUrls: newUrls };
        });
        
        setUploadedPhotos(prev => {
          const newUploaded = [...prev];
          newUploaded[index] = true;
          return newUploaded;
        });
  
        toast.success('Photo uploaded successfully!');
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error('Failed to upload photo. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const nextStep = () => {
    // Photo validation - at least 3 photos required
    if (currentStep === 6) {
      const uploadedCount = uploadedPhotos.filter(p => p).length;
      if (uploadedCount < 3) {
        toast.error('Please upload at least 3 photos to continue', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 8));
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate('/dashboard');
    }
  };

  const skipStep = () => {
    nextStep();
  };

  const completeProfile = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Query to find the user document by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('User profile not found');
        return;
      }

      // Get the actual userId from the document
      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;
      
      // Update user document with profile data
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        createdFor: profileData.createdFor, 
        height: profileData.height,
        religion: profileData.religion,
        motherTongue: profileData.motherTongue,
        originCountry: profileData.originCountry,
        settledCountry: profileData.settledCountry,
        growUpCountry: profileData.growUpCountry,
        degree: profileData.degree,
        dayJob: profileData.dayJob,
        lookingFor: profileData.lookingFor,
        status: profileData.maritalStatus,
        selectedLikesInvolvesMap: profileData.selectedLikesInvolvesMap,
        profileImageUrls: profileData.profileImageUrls.filter(url => url !== ''),
        aboutMe: profileData.aboutMe,
        updatedAt: new Date()
      });

      toast.success('Profile setup completed successfully!', {
        position: "top-right",
        autoClose: 2000,
      });

      setCurrentStep(8);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startExploring = () => {
    navigate('/dashboard');
  };

  return (
    <div className="profile-setup-page">
      <header className="ps-header">
      <img src="/images/logo.png" alt="Ibe Logo" className="logo-img" />
      </header>

      <div className="ps-container">
        <div className="ps-card">
          {currentStep > 1 && currentStep < 8 && <button className="back-btn" onClick={goBack}>←</button>}

          {/* Step 1: Profile For & Interests */}
          {currentStep === 1 && (
            <div className="step">
              <h1 className="title">Tell Us Your Preferences</h1>
              <p className="subtitle">Let's set up your profile to find the perfect match</p>

              <div className="form-section">
                <label className="form-label">This Profile is for</label>
                <div className="radio-group">
                  {['Myself', 'Parents', 'Brother', 'Sister', 'Relative', 'Friend', 'Others'].map(option => (
                    <div className="radio-option" key={option}>
                      <input
                        type="radio"
                        name="createdFor"
                        value={option}
                        id={option.toLowerCase()}
                        checked={profileData.createdFor === option}
                        onChange={(e) => handleChange('createdFor', e.target.value)}
                      />
                      <label htmlFor={option.toLowerCase()}>{option}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <label className="form-label">Interested in</label>
                <div className="radio-group">
                  {['Dating', 'Marriage', 'Both'].map(option => (
                    <div className="radio-option" key={option}>
                      <input
                        type="radio"
                        name="lookingFor"
                        value={option}
                        id={option.toLowerCase()}
                        checked={profileData.lookingFor === option}
                        onChange={(e) => handleChange('lookingFor', e.target.value)}
                      />
                      <label htmlFor={option.toLowerCase()}>{option}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="btn-group">
                <button className="btn btn-secondary" onClick={skipStep}>Skip</button>
                <button className="btn btn-primary" onClick={nextStep}>Continue</button>
              </div>
            </div>
          )}

          {/* Step 2: Basic Info */}
          {currentStep === 2 && (
            <div className="step">
              <div className="progress-bar" >
                <div className="progress-step active">
                  <div className="progress-icon">
                    <img src="/images/basic_info.png" alt="Basic Info" />
                  </div>
                  <span className="progress-label">Basic Info</span>
                </div>
                <div className="progress-step">
                  <div className="progress-icon">
                    <img src="/images/location.png" alt="Location" />
                  </div>
                  <span className="progress-label">Location</span>
                </div>
                <div className="progress-step">
                  <div className="progress-icon">
                    <img src="/images/education.png" alt="Education" />
                  </div>
                  <span className="progress-label">Education</span>
                </div>
                <div className="progress-step">
                  <div className="progress-icon">
                    <img src="/images/lifestyle.png" alt="Lifestyle" />
                  </div>
                  <span className="progress-label">Lifestyle</span>
                </div>
              </div>

              <h2 className="section-title"> Basic Info</h2>

              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Height</label>
                  <select
                    className="form-select"
                    value={profileData.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                  >
                    <option value="">Select Height</option>
                    {heightOptions.map(h => (
                      <option key={h.value} value={h.value}>{h.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Religion</label>
                  <select
                    className="form-select"
                    value={profileData.religion}
                    onChange={(e) => handleChange('religion', e.target.value)}
                  >
                    <option value="">Select Religion</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Muslim">Muslim</option>
                    <option value="Christian">Christian</option>
                    <option value="Sikh">Sikh</option>
                    <option value="Jain">Jain</option>
                    <option value="Parsi">Parsi</option>
                    <option value="Jew">Jew</option>
                    <option value="Buddhist">Buddhist</option>
                    <option value="Not Religious">Not Religious</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mother Tongue</label>
                <select
                  className="form-select"
                  value={profileData.motherTongue}
                  onChange={(e) => handleChange('motherTongue', e.target.value)}
                >
                  <option value="">Select Mother Tongue</option>
                  {motherTongues.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div className="btn-group">
                <button className="btn btn-secondary" onClick={skipStep}>Skip</button>
                <button className="btn btn-primary" onClick={nextStep}>Continue</button>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <div className="step">
              <div className="progress-bar">
                <div className="progress-step completed">
                  <div className="progress-icon">
                    <img src="/images/basic_info.png" alt="Basic Info" />
                  </div>
                  <span className="progress-label">Basic Info</span>
                </div>
                <div className="progress-step active">
                  <div className="progress-icon">
                    <img src="/images/location.png" alt="Location" />
                  </div>
                  <span className="progress-label">Location</span>
                </div>
                <div className="progress-step">
                  <div className="progress-icon">
                    <img src="/images/education.png" alt="Education" />
                  </div>
                  <span className="progress-label">Education</span>
                </div>
                <div className="progress-step">
                  <div className="progress-icon">
                    <img src="/images/lifestyle.png" alt="Lifestyle" />
                  </div>
                  <span className="progress-label">Lifestyle</span>
                </div>
              </div>

              <h2 className="section-title"> Location</h2>

              <div className="form-group">
                <label className="form-label">Origin Country</label>
                <select
                  className="form-select"
                  value={profileData.originCountry}
                  onChange={(e) => handleChange('originCountry', e.target.value)}
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
                  className="form-select"
                  value={profileData.settledCountry}
                  onChange={(e) => handleChange('settledCountry', e.target.value)}
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
                  className="form-select"
                  value={profileData.growUpCountry}
                  onChange={(e) => handleChange('growUpCountry', e.target.value)}
                >
                  <option value="">Select Grow Up Country</option>
                  <option value="USA">USA</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="India">India</option>
                  <option value="France">France</option>
                  <option value="Bulgaria">Bulgaria</option>
                  <option value="Prefer Not to say">Prefer Not to say</option>
                </select>
              </div>

              <div className="btn-group">
                <button className="btn btn-secondary" onClick={skipStep}>Skip</button>
                <button className="btn btn-primary" onClick={nextStep}>Continue</button>
              </div>
            </div>
          )}

          {/* Step 4: Education & Career */}
          {currentStep === 4 && (
            <div className="step">
              <div className="progress-bar">
                <div className="progress-step completed">
                  <div className="progress-icon">
                    <img src="/images/basic_info.png" alt="Basic Info" />
                  </div>
                  <span className="progress-label">Basic Info</span>
                </div>
                <div className="progress-step completed">
                  <div className="progress-icon">
                    <img src="/images/location.png" alt="Location" />
                  </div>
                  <span className="progress-label">Location</span>
                </div>
                <div className="progress-step active">
                  <div className="progress-icon">
                    <img src="/images/education.png" alt="Education" />
                  </div>
                  <span className="progress-label">Education</span>
                </div>
                <div className="progress-step">
                  <div className="progress-icon">
                    <img src="/images/lifestyle.png" alt="Lifestyle" />
                  </div>
                  <span className="progress-label">Lifestyle</span>
                </div>
              </div>

              <h2 className="section-title"> Education & Career</h2>

              <div className="form-group">
                <label className="form-label">Highest Education</label>
                <select
                  className="form-select"
                  value={profileData.degree}
                  onChange={(e) => handleChange('degree', e.target.value)}
                >
                  <option value="">Select Degree</option>
                  <option value="Doctorate">Doctorate</option>
                  <option value="PhD">PhD</option>
                  <option value="Masters">Masters</option>
                  <option value="Bachelors">Bachelors</option>
                  <option value="Associates">Associates</option>
                  <option value="Trade School">Trade School</option>
                  <option value="High School">High School</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Day Job</label>
                <select
                  className="form-select"
                  value={profileData.dayJob}
                  onChange={(e) => handleChange('dayJob', e.target.value)}
                >
                  <option value="">Select Day Job</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Engineer">Engineer</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Actor">Actor</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Archaeologist">Archaeologist</option>
                  <option value="Architect">Architect</option>
                  <option value="Artist">Artist</option>
                  <option value="Aviation Professional">Aviation Professional</option>
                  <option value="Beautician">Beautician</option>
                  <option value="Chef">Chef</option>
                  <option value="Nurse">Nurse</option>
                  <option value="IT Manager">IT Manager</option>
                  <option value="Bank Job">Bank Job</option>
                  <option value="Marketing Manager">Marketing Manager</option>
                  <option value="Fashion Designer">Fashion Designer</option>
                  <option value="Business owner">Business owner</option>
                  <option value="Advocate">Advocate</option>
                  <option value="Biomedical Engineer">Biomedical Engineer</option>
                  <option value="Biologist">Biologist</option>
                  <option value="Professor">Professor</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Marital Status</label>
                <select
                  className="form-select"
                  value={profileData.maritalStatus}
                  onChange={(e) => handleChange('maritalStatus', e.target.value)}
                >
                  <option value="">Select Marital Status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="divorced">Divorced</option>
                  <option value="separated">Separated</option>
                  <option value="registered partnership">Registered Partnership</option>
                </select>
              </div>

              <div className="btn-group">
                <button className="btn btn-secondary" onClick={skipStep}>Skip</button>
                <button className="btn btn-primary" onClick={nextStep}>Continue</button>
              </div>
            </div>
          )}

          {/* Step 5: Lifestyle (moved from step 6) */}
          {currentStep === 5 && (
            <div className="step">
              <div className="progress-bar">
                <div className="progress-step completed">
                  <div className="progress-icon">
                    <img src="/images/basic_info.png" alt="Basic Info" />
                  </div>
                  <span className="progress-label">Basic Info</span>
                </div>
                <div className="progress-step completed">
                  <div className="progress-icon">
                    <img src="/images/location.png" alt="Location" />
                  </div>
                  <span className="progress-label">Location</span>
                </div>
                <div className="progress-step completed">
                  <div className="progress-icon">
                    <img src="/images/education.png" alt="Education" />
                  </div>
                  <span className="progress-label">Education</span>
                </div>
                <div className="progress-step active">
                  <div className="progress-icon">
                    <img src="/images/lifestyle.png" alt="Lifestyle" />
                  </div>
                  <span className="progress-label">Lifestyle</span>
                </div>
              </div>

              <h2 className="section-title">Lifestyle</h2>

              <div className="lifestyle-container">
                {Object.entries(lifestyleCategories).map(([key, options]) => (
                  <div className="lifestyle-category" key={key}>
                    <label className="form-label">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</label>
                    <div className="checkbox-group">
                      {options.map(option => (
                        <div className="checkbox-option" key={option}>
                          <input
                            type="checkbox"
                            id={`${key}-${option}`}
                            checked={profileData.selectedLikesInvolvesMap[key]?.includes(option) || false}
                            onChange={() => handleLifestyleToggle(key, option)}
                          />
                          <label htmlFor={`${key}-${option}`}>{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="btn-group">
                <button className="btn btn-secondary" onClick={skipStep}>Skip</button>
                <button
                  className="btn btn-primary"
                  onClick={nextStep}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Photo Upload */}
{currentStep === 6 && (
  <div className="step">
    <h2 className="section-title">Upload Your Photo</h2>
    <p className="subtitle">We'd love to see you. Upload a photo for your dating journey.</p>

    <div className="photo-upload-container">
      {/* Main large photo */}
      <div className="photo-main-section">
        <div
          className={`photo-box-main ${profileData.profileImageUrls[0] ? 'has-image' : ''}`}
          onClick={() => document.getElementById('photo0').click()}
        >
          <input
            type="file"
            id="photo0"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handlePhotoUpload(e, 0)}
          />
          {profileData.profileImageUrls[0] ? (
            <>
              <img src={profileData.profileImageUrls[0]} alt="Upload 1" />
              <div className="photo-change-overlay">
                <span className="camera-icon">📷</span>
                <span>Change Photo</span>
              </div>
            </>
          ) : (
            <div className="photo-placeholder">
              <div className="photo-icon-large">+</div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - 2 small photos */}
      <div className="photo-right-section">
        {[1, 2].map(index => (
          <div
            key={index}
            className={`photo-box-small ${profileData.profileImageUrls[index] ? 'has-image' : ''}`}
            onClick={() => document.getElementById(`photo${index}`).click()}
          >
            <input
              type="file"
              id={`photo${index}`}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handlePhotoUpload(e, index)}
            />
            {profileData.profileImageUrls[index] ? (
              <img src={profileData.profileImageUrls[index]} alt={`Upload ${index + 1}`} />
            ) : (
              <div className="photo-icon-small">+</div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Bottom row - 3 small photos */}
    <div className="photo-bottom-row">
      {[3, 4, 5].map(index => (
        <div
          key={index}
          className={`photo-box-bottom ${profileData.profileImageUrls[index] ? 'has-image' : ''}`}
          onClick={() => document.getElementById(`photo${index}`).click()}
        >
          <input
            type="file"
            id={`photo${index}`}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handlePhotoUpload(e, index)}
          />
          {profileData.profileImageUrls[index] ? (
            <img src={profileData.profileImageUrls[index]} alt={`Upload ${index + 1}`} />
          ) : (
            <div className="photo-icon-small">+</div>
          )}
        </div>
      ))}
    </div>

    <div className="btn-group" style={{ marginTop: '30px' }}>
      <button className="btn btn-secondary" onClick={skipStep}>Skip</button>
      <button
        className="btn btn-primary"
        onClick={nextStep}
        disabled={uploadedPhotos.filter(p => p).length < 3}
      >
        Continue
      </button>
    </div>
  </div>
)}

          {/* Step 7: About Me */}
          {currentStep === 7 && (
            <div className="step">
              <h2 className="section-title">Tell Us Few Thing About Yourself</h2>
              <p className="subtitle">This is exactly how it will be shown in your profile</p>

              <div className="form-group">
                <textarea
                  className="form-textarea"
                  value={profileData.aboutMe}
                  onChange={(e) => handleChange('aboutMe', e.target.value)}
                  placeholder="Enter a description...."
                />
              </div>

              <div className="btn-group">
                <button className="btn btn-secondary" onClick={skipStep}>Skip</button>
                <button
                  className="btn btn-primary"
                  onClick={completeProfile}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 8: Success */}

          {/* Step 8: Success */}
          {currentStep === 8 && (
            <div className="step">
              <div className="success-icon">
                <img src="/images/setup.png" alt="Success" />
              </div>
              <h1 className="title">You're All Set! 🎉</h1>
              <p className="subtitle">Your profile is ready. Start searching and find your perfect match!</p>

              <button
                className="btn btn-primary"
                onClick={startExploring}
                style={{ width: '100%', marginTop: '30px' }}
              >
                Start Exploring matches
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}