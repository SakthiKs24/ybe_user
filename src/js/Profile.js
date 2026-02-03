import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import Header from './Header';
import '../css/Profile.css';
import { uploadProfileImageWithValidation } from '../utils/profilePhotoValidation';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profileInformation');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const dropdownRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    lookingFor: '',
    selectedLikesInvolvesMap: {
      books: [],
      childrenView: [],
      foods: [],
      hobbies: [],
      interests: [],
      movies: [],
      music: [],
      relaxWay: [],
      sleepingHabit: [],
      sports: [],
      tvShows: [],
      vacations: []
    },
    selectedPersonalityTraitsMap: {
      personalityType: '',
      starSign: '',
      drink: '',
      smoke: '',
      exercise: '',
      weatherType: [],
      poison: [],
      tripsType: [],
      pets: [],
      weekendNight: [],
      weekendActivities: [],
      eveningRoutine: [],
      passions: []
    }
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

  // Standard options for Degree and Day Job (to support "Others" input)
  const degreeOptions = [
    "Doctorate",
    "PhD",
    "Masters",
    "Bachelors",
    "Associates",
    "Trade School",
    "High School"
  ];
  const dayJobOptions = [
    "Doctor",
    "Engineer",
    "Teacher",
    "Actor",
    "Accountant",
    "Archaeologist",
    "Architect",
    "Artist",
    "Aviation Professional",
    "Beautician",
    "Chef",
    "Nurse",
    "IT Manager",
    "Bank Job",
    "Marketing Manager",
    "Fashion Designer",
    "Business owner",
    "Advocate",
    "Biomedical Engineer",
    "Biologist",
    "Professor"
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

  // Personality Traits Options
  const personalityTraitsMap = {
    personalityType: ["Introvert", "Extrovert", "Ambivert"],
    starSign: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
    drink: ["Not at all", "On special occasions", "Once in a week", "Every day"],
    smoke: ["Fancy", "Occasionally", "Not interested"],
    exercise: ["Daily", "Often", "Rarely", "No"],
    weatherType: ["Sunny and warm", "Cloudy", "Cool for a cozy vibe", "Rainy", "Snowy and cold", "Breezy", "Hot or tropical"],
    poison: ["Tea", "Coffee", "Beer", "Vodka", "Gin", "Whiskey", "Rum", "Bandy", "Teetotaller"],
    tripsType: ["A solo trip", "a family trip", "friend's trip"],
    pets: ["Dog", "Cat", "Fish", "Bird", "Rabbit", "Hamster", "Guinea Pig", "Lizard", "Snake", "Turtle", "Ferret", "Hedgehog", "Doesn't like pets"],
    weekendNight: ["Party night", "A candle light dinner", "Movie night", "Night out", "A cosy night at home"],
    weekendActivities: ["Watching TV", "Movies", "Restaurants", "Hike", "Exercising", "Time with friends", "Time with family", "Shopping", "Browsing online", "Weekend sleep"],
    eveningRoutine: ["Cook at home", "Dine out", "Movie", "Reading"],
    passions: ["Painting", "Drawing", "Writing", "Photography", "Playing instruments", "Composing", "Singing", "Acting", "Performing Arts", "Crafting", "Graphic Design", "Illustration", "Fashion Design", "Filmmaking", "Directing", "Dancing", "Choreography", "Reading", "Learning new languages", "Studying history", "Philosophy", "Science", "Innovation", "Technology", "Coding", "Psychology", "Political activism", "Entrepreneurship", "Business development", "Running", "Yoga", "Pilates", "Weightlifting", "Body building", "Sports", "Swimming", "Water sports", "Cycling", "Mountain biking", "Rock climbing", "Hiking", "Surfing", "Skateboarding", "Martial arts", "Zumba", "Charity work", "Animal rescue and care", "Teaching", "Self-improvement and growth", "Mindfulness or meditation", "Investing", "Public speaking", "Leadership development", "Networking", "Meeting people", "Spirituality", "Religion", "Business", "Marketing", "Branding", "Real estate investment", "Stock trading", "Investments", "Social media", "Digital marketing", "Camping", "Fishing", "Hunting", "Gardening", "Farming", "Bird watching", "Beach-combing", "Kayaking", "Canoeing", "Paddle boarding", "Stargazing", "Astronomy", "Gaming board games", "Cyber-security", "Ethical hacking", "Podcasting", "Content creation", "Graphic design", "Animation", "AI and machine learning", "Parenting", "Family", "Romantic relationships", "Pet care", "Mentoring", "Coaching", "Fashion", "Styling", "Home décor", "Interior design", "Cooking", "Baking", "Public service"]
  };

  // Lifestyle Categories (from ProfileSetup)
  const lifestyleCategories = {
    movies: ["Action", "Adventure", "Romantic", "Comedies", "Thrillers", "Mysteries", "Documentaries", "Fantasy", "Science fiction", "Horror", "supernatural"],
    music: ["Pop", "mainstream hits", "Rock", "Classical", "Instrumental", "Hip-hop", "Rap", "R&B", "Jazz", "Blues", "EDM"],
    foods: ["Italian", "Mexican", "Asian", "Indian", "Mediterranean", "American"],
    books: ["Fiction", "Fantasy", "Adventure", "Romance", "Non-fiction", "Self-help", "Biographies", "Mysteries", "Crime novels", "Science fiction", "Futuristic stories", "Poetry", "Short stories", "I don't usually read books"],
    vacations: ["Beach vacations", "Hiking", "Outdoor adventures", "Exploring big cities and their culture", "Exploring remote villages", "Historic buildings", "Museum", "Camping", "Theme parks", "Cruising on a ship", "Staying at home for a staycation"],
    tvShows: ["Sitcoms", "Comedy shows", "Reality shows", "Competitions", "Crime dramas", "Mysteries", "Sci-fi", "fantasy series", "News", "Current affairs", "Nature", "Wildlife documentaries"],
    hobbies: ["Cooking", "Baking", "Painting", "Drawing", "Crafting", "Playing video games, Board games", "Gardening", "Planting", "Musical instrument", "Writing stories", "Journaling"],
    sports: ["Football", "Basketball", "Tennis", "Baseball", "American Football", "Cricket", "Rugby", "Hockey", "Golf", "Swimming", "Athletics ,Karate", "Judo", "Boxing", "Volleyball", "Cycling", "Skateboarding", "Snowboarding", "Wrestling", "Table Tennis", "Badminton", "Archery", "Gymnastics", "Sailing", "Windsurfing", "Rock Climbing", "Mountaineering"],
    relaxWay: ["Reading a book", "Reading a magazine", "Watching movies", "watching TV", "Long walk", "Exercising", "Meditating, Yoga", "Napping or sleeping", "Talking to friends or family"],
    sleepingHabit: ["Early bed & Early wake up", "Late bed & Late Wake up", "Night owl", "It depends"],
    childrenView: ["Very much interested", "Not more than one", "No interest at all"],
    interests: ["Learning", "Investing", "Reading", "Meditation", "Mindfulness practices", "Painting", "Drawing", "Sketching", "Writing poetry", "Writing stories", "Journaling", "Photography", "Acting", "Theater", "Space exploration", "Astronomy", "Artificial intelligence and robotics", "Environmental science and sustainability", "Medical research", "Hiking", "Camping", "Nature exploration", "Yoga", "Pilates", "Wellness exercises", "Sports", "Rock climbing", "Surfing", "Food", "Movies", "TV shows", "Gaming", "Music", "Live concerts", "Collecting items", "Volunteering", "Community service"]
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
              lookingFor: data.lookingFor || '',
              selectedLikesInvolvesMap: {
                books: data.selectedLikesInvolvesMap?.books || [],
                childrenView: data.selectedLikesInvolvesMap?.childrenView || [],
                foods: data.selectedLikesInvolvesMap?.foods || [],
                hobbies: data.selectedLikesInvolvesMap?.hobbies || [],
                interests: data.selectedLikesInvolvesMap?.interests || [],
                movies: data.selectedLikesInvolvesMap?.movies || [],
                music: data.selectedLikesInvolvesMap?.music || [],
                relaxWay: data.selectedLikesInvolvesMap?.relaxWay || [],
                sleepingHabit: data.selectedLikesInvolvesMap?.sleepingHabit || [],
                sports: data.selectedLikesInvolvesMap?.sports || [],
                tvShows: data.selectedLikesInvolvesMap?.tvShows || [],
                vacations: data.selectedLikesInvolvesMap?.vacations || []
              },
              selectedPersonalityTraitsMap: {
                personalityType: data.selectedPersonalityTraitsMap?.personalityType || '',
                starSign: data.selectedPersonalityTraitsMap?.starSign || '',
                drink: data.selectedPersonalityTraitsMap?.drink || '',
                smoke: data.selectedPersonalityTraitsMap?.smoke || '',
                exercise: data.selectedPersonalityTraitsMap?.exercise || '',
                weatherType: data.selectedPersonalityTraitsMap?.weatherType || [],
                poison: data.selectedPersonalityTraitsMap?.poison || [],
                tripsType: data.selectedPersonalityTraitsMap?.tripsType || [],
                pets: data.selectedPersonalityTraitsMap?.pets || [],
                weekendNight: data.selectedPersonalityTraitsMap?.weekendNight || [],
                weekendActivities: data.selectedPersonalityTraitsMap?.weekendActivities || [],
                eveningRoutine: data.selectedPersonalityTraitsMap?.eveningRoutine || [],
                passions: data.selectedPersonalityTraitsMap?.passions || []
              }
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

  const handlePersonalityTraitChange = (field, value) => {
    // Check if it's single-select or multi-select
    const singleSelectFields = ['personalityType', 'starSign', 'drink', 'smoke', 'exercise'];
    
    if (singleSelectFields.includes(field)) {
      // Single select
      setFormData(prev => ({
        ...prev,
        selectedPersonalityTraitsMap: {
          ...prev.selectedPersonalityTraitsMap,
          [field]: prev.selectedPersonalityTraitsMap[field] === value ? '' : value
        }
      }));
    } else {
      // Multi select
      setFormData(prev => {
        const currentSelections = prev.selectedPersonalityTraitsMap[field] || [];
        const isSelected = currentSelections.includes(value);
        
        return {
          ...prev,
          selectedPersonalityTraitsMap: {
            ...prev.selectedPersonalityTraitsMap,
            [field]: isSelected
              ? currentSelections.filter(item => item !== value)
              : [...currentSelections, value]
          }
        };
      });
    }
  };

  const handleLikesInvolvesToggle = (category, option) => {
    // Single-select categories
    const singleSelectCategories = ['relaxWay', 'sleepingHabit', 'childrenView'];
    
    if (singleSelectCategories.includes(category)) {
      // Single select
      setFormData(prev => {
        const currentSelection = prev.selectedLikesInvolvesMap[category] || [];
        const isSelected = currentSelection.includes(option);
        
        return {
          ...prev,
          selectedLikesInvolvesMap: {
            ...prev.selectedLikesInvolvesMap,
            [category]: isSelected ? [] : [option]
          }
        };
      });
    } else {
      // Multi select
      setFormData(prev => {
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
    }
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
      } else if (activeSection === 'personalityTraits') {
        updateData.selectedPersonalityTraitsMap = formData.selectedPersonalityTraitsMap;
      } else if (activeSection === 'likesInvolves') {
        updateData.selectedLikesInvolvesMap = formData.selectedLikesInvolvesMap;
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
  const handleDeleteAccount = async () => {
    try {
      if (userData && userData.docId) {
        // Delete user document from Firestore
        const userDocRef = doc(db, 'users', userData.docId);
        await deleteDoc(userDocRef);
        
        // Sign out the user
        await signOut(auth);
        
        // Clear localStorage
        localStorage.removeItem('userDetails');
        
        toast.success('Account deleted successfully!', {
          position: "top-right",
          autoClose: 2000,
        });
        
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please try again.');
    }
  };
  const handlePhotoUpload = async (event, index) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!userData?.docId) {
      toast.error('Profile not loaded');
      event.target.value = '';
      return;
    }

    try {
      setLoading(true);

      const result = await uploadProfileImageWithValidation(file, userData.docId);

      if (!result.success) {
        toast.error(result.error || 'Please upload a valid person image.', {
          position: 'top-right',
          autoClose: 5000,
        });
        event.target.value = '';
        return;
      }

      const newUrls = [...(userData.profileImageUrls || [])];
      newUrls[index] = result.url;

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
    event.target.value = '';
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

  const calculateProfileCompleteness = () => {
    if (!userData) return { percentage: 0, completed: 0, total: 0 };
    
    // Only count the 10 core profile sections toward progress (exclude utility items)
    const progressSections = onboardingSteps.filter(
      (step) => step.key !== 'logout' && step.key !== 'deleteAccount'
    );
    const completedSteps = progressSections.filter(step => step.completed).length;
    const totalSteps = progressSections.length || 10; // ensure divisor is 10
    
    return {
      percentage: (completedSteps / totalSteps) * 100,
      completed: completedSteps,
      total: totalSteps
    };
  };
  

  const onboardingSteps = [
    { key: 'profileInformation', label: 'Profile Information', completed: !!(userData?.name && userData?.dateOfBirth) },
    { key: 'profilePhoto', label: 'Profile Photos', completed: !!(userData?.profileImageUrls && userData.profileImageUrls.filter(url => url).length >= 3) },
    { key: 'personalDetails', label: 'Personal Details', completed: !!(userData?.height && userData?.religion && userData?.community) },
    { key: 'aboutMe', label: 'About Me', completed: !!(userData?.aboutMe) },
    { key: 'preferences', label: 'Preferences', completed: !!(userData?.genderPreference && userData?.lookingFor) },
    { key: 'location', label: 'Location Details', completed: !!(userData?.settledCountry) },
    { key: 'education', label: 'Education & Career', completed: !!(userData?.degree && userData?.dayJob) },
    { key: 'lifestyle', label: 'Lifestyle', completed: !!(userData?.bodyBuild) },
    { key: 'personalityTraits', label: 'Personality Traits', completed: !!(userData?.selectedPersonalityTraitsMap?.personalityType) },
    { key: 'likesInvolves', label: 'Likes & Involves', completed: !!(userData?.selectedLikesInvolvesMap?.movies?.length > 0) },
    { key: 'deleteAccount', label: 'Delete Account', completed: true }, // NEW LINE
    { key: 'logout', label: 'Logout', completed: true }, 

  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profileInformation':
        return (
          <div className="section-content">
            <div className="section-header">
              <h3>Profile Information</h3>
              {!editMode && (
                <button className="edit-btn" onClick={() => setEditMode(true)}>
                  ✏️  Edit
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
                disabled
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
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const imageUrl = userData?.profileImageUrls?.[index];
                    
                    return (
                      <div key={index} className="photo-item">
                        {imageUrl ? (
                          <img src={imageUrl} alt={`Profile ${index + 1}`} />
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
                          {imageUrl ? 'Change' : 'Upload'}
                        </button>
                      </div>
                    );
                  })}
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
                value={
                  editMode
                    ? (degreeOptions.includes(formData.degree) ? formData.degree : (formData.degree ? 'Others' : ''))
                    : (degreeOptions.includes(userData?.degree || '') ? (userData?.degree || '') : 'Others')
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (!editMode) return;
                  if (v === 'Others') {
                    setFormData(prev => ({ ...prev, degree: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, degree: v }));
                  }
                }}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Degree</option>
                {degreeOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="Others">Others</option>
              </select>
              {editMode && (!degreeOptions.includes(formData.degree)) && (
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your highest education"
                  value={formData.degree}
                  onChange={(e) => handleChange('degree', e.target.value)}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Day Job</label>
              <select
                value={
                  editMode
                    ? (dayJobOptions.includes(formData.dayJob) ? formData.dayJob : (formData.dayJob ? 'Others' : ''))
                    : (dayJobOptions.includes(userData?.dayJob || '') ? (userData?.dayJob || '') : 'Others')
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (!editMode) return;
                  if (v === 'Others') {
                    setFormData(prev => ({ ...prev, dayJob: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, dayJob: v }));
                  }
                }}
                className="form-input"
                disabled={!editMode}
              >
                <option value="">Select Day Job</option>
                {dayJobOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="Others">Others</option>
              </select>
              {editMode && (!dayJobOptions.includes(formData.dayJob)) && (
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your day job"
                  value={formData.dayJob}
                  onChange={(e) => handleChange('dayJob', e.target.value)}
                  style={{ marginTop: 8 }}
                />
              )}
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
                <option value="Australia">Australia</option>
                <option value="India">India</option>
                <option value="France">France</option>
                <option value="Bulgaria">Bulgaria</option>
                <option value="Prefer Not to say">Prefer Not to say</option>
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


// 1. In the personalityTraits section, update the rendering to handle multi-select properly:

case 'personalityTraits':
  return (
    <div className="section-content">
      <div className="section-header">
        <h2>Personality Traits & Passions</h2>
        {!editMode && (
          <button className="edit-btn" onClick={() => setEditMode(true)}>
            ✏️ Edit
          </button>
        )}
      </div>

      <div className="lifestyle-container1">
        {Object.entries(personalityTraitsMap).map(([key, options]) => {
          // Single-select fields use radio buttons
          const singleSelectFields = ['personalityType', 'starSign', 'drink', 'smoke', 'exercise'];
          const isSingleSelect = singleSelectFields.includes(key);
          
          const currentValue = editMode 
            ? formData.selectedPersonalityTraitsMap[key]
            : userData?.selectedPersonalityTraitsMap?.[key] || (isSingleSelect ? '' : []);
          
          return (
            <div className="lifestyle-category" key={key}>
              <label className="form-label">
                {key === 'personalityType' ? 'Personality Type' :
                 key === 'starSign' ? 'Star Sign' :
                 key === 'drink' ? 'Do you drink?' :
                 key === 'smoke' ? 'Do you smoke?' :
                 key === 'exercise' ? 'Exercise' :
                 key === 'weatherType' ? 'Weather Type' :
                 key === 'poison' ? 'Poison' :
                 key === 'tripsType' ? 'Trip Type' :
                 key === 'pets' ? 'Pets' :
                 key === 'weekendNight' ? 'Weekend Night' :
                 key === 'weekendActivities' ? 'Weekend Activities' :
                 key === 'eveningRoutine' ? 'Evening Routine' :
                 key === 'passions' ? 'Passions' : key}
              </label>
              
              {isSingleSelect ? (
                <div className="radio-group">
                  {options.map(option => (
                    <div className="radio-option" key={option}>
                      <input
                        type="radio"
                        name={key}
                        id={`${key}-${option}`}
                        checked={currentValue === option}
                        onChange={() => editMode && handlePersonalityTraitChange(key, option)}
                        disabled={!editMode}
                      />
                      <label htmlFor={`${key}-${option}`}>{option}</label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="checkbox-group">
                  {options.map(option => {
                    const isSelected = Array.isArray(currentValue) && currentValue.includes(option);
                    
                    return (
                      <div className="checkbox-option" key={option}>
                        <input
                          type="checkbox"
                          id={`${key}-${option}`}
                          checked={isSelected}
                          onChange={() => editMode && handlePersonalityTraitChange(key, option)}
                          disabled={!editMode}
                        />
                        <label htmlFor={`${key}-${option}`}>{option}</label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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


    case 'likesInvolves':
  return (
    <div className="section-content">
      <div className="section-header">
        <h2>Likes & Involves</h2>
        {!editMode && (
          <button className="edit-btn" onClick={() => setEditMode(true)}>
            ✏️ Edit
          </button>
        )}
      </div>

      <div className="lifestyle-container1">
        {Object.entries(lifestyleCategories).map(([key, options]) => {  // Changed from likesInvolvesMap
          const currentSelections = editMode
            ? formData.selectedLikesInvolvesMap[key] || []
            : userData?.selectedLikesInvolvesMap?.[key] || [];
          
          return (
            <div className="lifestyle-category" key={key}>
              <label className="form-label">
                {key === 'movies' ? 'Movies' :
                 key === 'music' ? 'Music' :
                 key === 'foods' ? 'Foods' :
                 key === 'books' ? 'Books' :
                 key === 'vacations' ? 'Vacations' :
                 key === 'tvShows' ? 'TV Shows' :
                 key === 'hobbies' ? 'Hobbies' :
                 key === 'sports' ? 'Sports' :
                 key === 'relaxWay' ? 'Relax Way' :
                 key === 'sleepingHabit' ? 'Sleeping Habit' :
                 key === 'childrenView' ? 'Children View' :
                 key === 'interests' ? 'Interests' : key}
              </label>
              <div className="checkbox-group">
                {options.map(option => {
                  const isSelected = currentSelections.includes(option);
                  
                  return (
                    <div className="checkbox-option" key={option}>
                      <input
                        type="checkbox"
                        id={`${key}-${option}`}
                        checked={isSelected}
                        onChange={() => editMode && handleLikesInvolvesToggle(key, option)}
                        disabled={!editMode}
                      />
                      <label htmlFor={`${key}-${option}`}>{option}</label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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

  const profileCompletenessData = calculateProfileCompleteness();

  return (
    <div className="profile-container">
      <Header 
        userData={userData}
        showProfileDropdown={showProfileDropdown}
        setShowProfileDropdown={setShowProfileDropdown}
        dropdownRef={dropdownRef}
        currentPage="profile"
      />

      <div className="profile-content">
        {/* Left Sidebar */}
        <aside className="profile-sidebar">
          <h3 className="sidebar-title">Profile settings</h3>
          
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
              <div className="progress-bar1">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min(100, Math.round(profileCompletenessData.percentage))}%` }}
              ></div>
            </div>
              <p className="completeness-message">
                {Math.round(profileCompletenessData.percentage) === 100 
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
               className={`onboarding-step ${activeSection === step.key ? 'active' : ''} ${step.key === 'logout' || step.key === 'deleteAccount' ? 'logout-step' : ''}`}
               onClick={() => {
                 if (step.key === 'logout') {
                   setShowLogoutModal(true);
                 } else if (step.key === 'deleteAccount') {
                   setShowDeleteModal(true);
                 } else {
                   setActiveSection(step.key);
                   setEditMode(false);
                 }
               }}
             >
               <div className={`step-checkbox ${step.completed ? 'completed' : 'pending'}`}>
                 {step.key === 'logout' ? (
                   <img
                     src="/images/logout.jpeg"
                     alt="Logout"
                     className="step-status-img"
                   />
                 ) : step.key === 'deleteAccount' ? (
                   <img
                     src="/images/delete.png"
                     alt="Delete Account"
                     className="step-status-img"
                   />
                 ) : (
                   <img
                     src={
                       step.completed
                         ? '/images/step-tick.png'
                         : '/images/step-untick.png'
                     }
                     alt={step.completed ? 'Completed' : 'Not Completed'}
                     className="step-status-img"
                   />
                 )}
               </div>
               <span className="step-label">{step.label}</span>
               <span className="step-arrow">›</span>
             </div>
             
              ))}
            </div>
          </div>


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
      {showDeleteModal && (
  <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h3>Delete Account</h3>
      <p>Do you want to delete your account? This action cannot be undone.</p>
      <div className="modal-buttons">
        <button
          onClick={() => setShowDeleteModal(false)}
          className="btn-cancel"
        >
          No, Keep it
        </button>
        <button
          onClick={() => {
            setShowDeleteModal(false);
            handleDeleteAccount();
          }}
          className="btn-confirm"
          style={{ backgroundColor: '#FF2B45' }}
        >
          Delete Account
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}