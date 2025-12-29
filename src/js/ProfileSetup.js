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
    aboutMe: '',
    bodyBuild: '',
    // Personality Traits - Single select (String)
    personalityType: '',
    starSign: '',
    drink: '',
    smoke: '',
    exercise: '',
    // Personality Traits - Multi select (Array)
    weatherType: [],
    poison: [],
    tripsType: [],
    pets: [],
    weekendNight: [],
    weekendActivities: [],
    eveningRoutine: [],
    passions: []
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

  // Physical Build Type options
  const physicalBuildType = [
    "Slim/Lean",
    "Athletic/Toned",
    "Average/Medium Build",
    "Broad Shoulders",
    "Muscular",
    "Stocky/Heavily Built",
    "Full-Figured/Plus-Size",
    "Petite/Small Frame",
    "Tall and Lean",
    "Prefer Not to Say"
  ];

  // Personality Traits Map
  const personalityTraitsMap = {
    personalityType: ["Introvert", "Extrovert", "Ambivert"],
    starSign: [
      "Aries",
      "Taurus",
      "Gemini",
      "Cancer",
      "Leo",
      "Virgo",
      "Libra",
      "Scorpio",
      "Sagittarius",
      "Capricorn",
      "Aquarius",
      "Pisces"
    ],
    drink: [
      "Not at all",
      "On special occasions",
      "Once in a week",
      "Every day"
    ],
    smoke: ["Fancy", "Occasionally", "Not interested"],
    exercise: ["Daily", "Often", "Rarely", "No"],
    weatherType: [
      "Sunny and warm",
      "Cloudy",
      "Cool for a cozy vibe",
      "Rainy",
      "Snowy and cold",
      "Breezy",
      "Hot or tropical"
    ],
    poison: [
      "Tea",
      "Coffee",
      "Beer",
      "Vodka",
      "Gin",
      "Whiskey",
      "Rum",
      "Bandy",
      "Teetotaller"
    ],
    tripsType: ["A solo trip", "a family trip", "friend's trip"],
    pets: [
      "Dog",
      "Cat",
      "Fish",
      "Bird",
      "Rabbit",
      "Hamster",
      "Guinea Pig",
      "Lizard",
      "Snake",
      "Turtle",
      "Ferret",
      "Hedgehog",
      "Doesn't like pets"
    ],
    weekendNight: [
      "Party night",
      "A candle light dinner",
      "Movie night",
      "Night out",
      "A cosy night at home"
    ],
    weekendActivities: [
      "Watching TV",
      "Movies",
      "Restaurants",
      "Hike",
      "Exercising",
      "Time with friends",
      "Time with family",
      "Shopping",
      "Browsing online",
      "Weekend sleep"
    ],
    eveningRoutine: ["Cook at home", "Dine out", "Movie", "Reading"],
    passions: [
      "Painting",
      "Drawing",
      "Writing",
      "Photography",
      "Playing instruments",
      "Composing",
      "Singing",
      "Acting",
      "Performing Arts",
      "Crafting",
      "Graphic Design",
      "Illustration",
      "Fashion Design",
      "Filmmaking",
      "Directing",
      "Dancing",
      "Choreography",
      "Reading",
      "Learning new languages",
      "Studying history",
      "Philosophy",
      "Science",
      "Innovation",
      "Technology",
      "Coding",
      "Psychology",
      "Political activism",
      "Entrepreneurship",
      "Business development",
      "Running",
      "Yoga",
      "Pilates",
      "Weightlifting",
      "Body building",
      "Sports",
      "Swimming",
      "Water sports",
      "Cycling",
      "Mountain biking",
      "Rock climbing",
      "Hiking",
      "Surfing",
      "Skateboarding",
      "Martial arts",
      "Zumba",
      "Charity work",
      "Animal rescue and care",
      "Teaching",
      "Self-improvement and growth",
      "Mindfulness or meditation",
      "Investing",
      "Public speaking",
      "Leadership development",
      "Networking",
      "Meeting people",
      "Spirituality",
      "Religion",
      "Business",
      "Marketing",
      "Branding",
      "Real estate investment",
      "Stock trading",
      "Investments",
      "Social media",
      "Digital marketing",
      "Camping",
      "Fishing",
      "Hunting",
      "Gardening",
      "Farming",
      "Bird watching",
      "Beach-combing",
      "Kayaking",
      "Canoeing",
      "Paddle boarding",
      "Stargazing",
      "Astronomy",
      "Gaming board games",
      "Cyber-security",
      "Ethical hacking",
      "Podcasting",
      "Content creation",
      "Graphic design",
      "Animation",
      "AI and machine learning",
      "Parenting",
      "Family",
      "Romantic relationships",
      "Pet care",
      "Mentoring",
      "Coaching",
      "Fashion",
      "Styling",
      "Home décor",
      "Interior design",
      "Cooking",
      "Baking",
      "Public service"
    ]
  };

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
      // Single-select fields should use handleLifestyleSingleSelect, but just in case
      const isSingleSelect = ['relaxWay', 'sleepingHabit', 'childrenView'].includes(category);
      if (isSingleSelect) {
        const currentSelection = prev.selectedLikesInvolvesMap[category] || [];
        const isSelected = currentSelection.includes(option);
        return {
          ...prev,
          selectedLikesInvolvesMap: {
            ...prev.selectedLikesInvolvesMap,
            [category]: isSelected ? [] : [option] // Array with single item or empty array
          }
        };
      }
      
      // Multi-select fields
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

  const handleLifestyleSingleSelect = (category, option) => {
    setProfileData(prev => {
      const currentSelection = prev.selectedLikesInvolvesMap[category] || [];
      const isSelected = currentSelection.includes(option);
      
      return {
        ...prev,
        selectedLikesInvolvesMap: {
          ...prev.selectedLikesInvolvesMap,
          [category]: isSelected ? [] : [option] // Array with single item or empty array
        }
      };
    });
  };

  // Handler for personality traits single-select (String fields)
  const handlePersonalitySingleSelect = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: prev[field] === value ? '' : value
    }));
  };

  // Handler for personality traits multi-select (Array fields)
  const handlePersonalityMultiSelect = (field, option) => {
    setProfileData(prev => {
      const currentSelections = prev[field] || [];
      const isSelected = currentSelections.includes(option);
      
      return {
        ...prev,
        [field]: isSelected
          ? currentSelections.filter(item => item !== option)
          : [...currentSelections, option]
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
        bodyBuild: profileData.bodyBuild,
        // Personality Traits - Single Select (String)
        personalityType: profileData.personalityType || '',
        starSign: profileData.starSign || '',
        drink: profileData.drink || '',
        smoke: profileData.smoke || '',
        exercise: profileData.exercise || '',
        // Personality Traits - Multi Select (Array)
        weatherType: profileData.weatherType || [],
        poison: profileData.poison || [],
        tripsType: profileData.tripsType || [],
        pets: profileData.pets || [],
        weekendNight: profileData.weekendNight || [],
        weekendActivities: profileData.weekendActivities || [],
        eveningRoutine: profileData.eveningRoutine || [],
        passions: profileData.passions || [],
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

  // Render progress bar based on current step
  const renderProgressBar = () => {
    if (currentStep === 1 || currentStep >= 8) return null;
    
    const getStepStatus = (stepNumber) => {
      if (currentStep === stepNumber) return 'active';
      if (currentStep > stepNumber) return 'completed';
      return '';
    };

    const getImageSrc = (baseName, stepNumber) => {
      const status = getStepStatus(stepNumber);
      if (status === 'active' || status === 'completed') {
        return `/images/${baseName}_selected.png`;
      }
      // For basic_info, use basic_info.png for unselected, others use _unselected
      if (baseName === 'basic_info') {
        return `/images/${baseName}.png`;
      }
      return `/images/${baseName}_unselected.png`;
    };

    return (
      <div className="progress-bar" data-step={currentStep}>
        <div className={`progress-step ${getStepStatus(2)}`}>
          <div className="progress-icon">
            <img src={getImageSrc('basic_info', 2)} alt="Basic Info" />
          </div>
          <span className="progress-label">Basic Info</span>
        </div>
        <div className={`progress-step ${getStepStatus(3)}`}>
          <div className="progress-icon">
            <img src={getImageSrc('location', 3)} alt="Location" />
          </div>
          <span className="progress-label">Location</span>
        </div>
        <div className={`progress-step ${getStepStatus(4)}`}>
          <div className="progress-icon">
            <img src={getImageSrc('education', 4)} alt="Education" />
          </div>
          <span className="progress-label">Education</span>
        </div>
        <div className={`progress-step ${getStepStatus(5)}`}>
          <div className="progress-icon">
            <img src={getImageSrc('lifestyle', 5)} alt="Lifestyle" />
          </div>
          <span className="progress-label">Lifestyle</span>
        </div>
      </div>
    );
  };

  return (
    <div className="profile-setup-page">
      <header className="ps-header">
      <img src="/images/logo.png" alt="Ibe Logo" className="logo-img" />
      </header>

      <div className="ps-container">
        {/* Progress Section - Above the card */}
        {currentStep > 1 && currentStep < 8 && (
          <div className="progress-section">
            <h1 className="progress-title">Create Your Profile</h1>
            <p className="progress-subtitle">Let's set up your profile to find the perfect match</p>
            {renderProgressBar()}
          </div>
        )}

        <div className="ps-card">
          {currentStep > 1 && currentStep < 8 && (
            <button className="back-btn" onClick={goBack}>
              <img src="/images/back.png" alt="Back" />
            </button>
          )}

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
              <h2 className="section-title">Lifestyle</h2>

              <div className="lifestyle-container">
                {/* Physical Build Type - Single Select */}
                <div className="lifestyle-category">
                  <label className="form-label">Physical Build Type</label>
                  <div className="radio-group">
                    {physicalBuildType.map(option => (
                      <div className="radio-option" key={option}>
                        <input
                          type="radio"
                          name="bodyBuild"
                          id={`bodyBuild-${option}`}
                          checked={profileData.bodyBuild === option}
                          onChange={() => handleChange('bodyBuild', option)}
                        />
                        <label htmlFor={`bodyBuild-${option}`}>{option}</label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Personality Traits - Single Select Fields */}
                {Object.entries(personalityTraitsMap).filter(([key]) => 
                  ['personalityType', 'starSign', 'drink', 'smoke', 'exercise'].includes(key)
                ).map(([key, options]) => (
                  <div className="lifestyle-category" key={key}>
                    <label className="form-label">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </label>
                    <div className="radio-group">
                      {options.map(option => (
                        <div className="radio-option" key={option}>
                          <input
                            type="radio"
                            name={key}
                            id={`${key}-${option}`}
                            checked={profileData[key] === option}
                            onChange={() => handlePersonalitySingleSelect(key, option)}
                          />
                          <label htmlFor={`${key}-${option}`}>{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Personality Traits - Multi Select Fields */}
                {Object.entries(personalityTraitsMap).filter(([key]) => 
                  ['weatherType', 'poison', 'tripsType', 'pets', 'weekendNight', 'weekendActivities', 'eveningRoutine', 'passions'].includes(key)
                ).map(([key, options]) => (
                  <div className="lifestyle-category" key={key}>
                    <label className="form-label">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </label>
                    <div className="checkbox-group">
                      {options.map(option => {
                        const currentSelections = profileData[key] || [];
                        const isSelected = currentSelections.includes(option);
                        
                        return (
                          <div className="checkbox-option" key={option}>
                            <input
                              type="checkbox"
                              id={`${key}-${option}`}
                              checked={isSelected}
                              onChange={() => handlePersonalityMultiSelect(key, option)}
                            />
                            <label htmlFor={`${key}-${option}`}>{option}</label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {Object.entries(lifestyleCategories).map(([key, options]) => {
                  const isSingleSelect = ['relaxWay', 'sleepingHabit', 'childrenView'].includes(key);
                  
                  return (
                    <div className="lifestyle-category" key={key}>
                      <label className="form-label">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</label>
                      <div className={isSingleSelect ? "radio-group" : "checkbox-group"}>
                        {options.map(option => {
                          const currentValue = profileData.selectedLikesInvolvesMap[key] || [];
                          const isSelected = isSingleSelect 
                            ? currentValue.includes(option)
                            : currentValue.includes(option) || false;
                          
                          return (
                            <div className={isSingleSelect ? "radio-option" : "checkbox-option"} key={option}>
                              <input
                                type={isSingleSelect ? "radio" : "checkbox"}
                                name={isSingleSelect ? key : undefined}
                                id={`${key}-${option}`}
                                checked={isSelected}
                                onChange={() => isSingleSelect 
                                  ? handleLifestyleSingleSelect(key, option)
                                  : handleLifestyleToggle(key, option)
                                }
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