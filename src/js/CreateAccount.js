import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/CreateAccount.css';
import Navbar from './Navbar';
// import { COUNTRIES_DATA } from '../js/countriesData'; // Commented out - phone number field removed

// Helper function to get current location
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Try to reverse geocode to get address details
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();

          const address = data.display_name || '';
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
          const countryCode = data.address?.country_code?.toUpperCase() || '';

          resolve({
            address: address,
            city: city,
            countryCode: countryCode,
            latitude: latitude.toString(),
            longitude: longitude.toString()
          });
        } catch (error) {
          // If reverse geocoding fails, just return coordinates
          console.warn('Reverse geocoding failed, using coordinates only:', error);
          resolve({
            address: '',
            city: '',
            countryCode: '',
            latitude: latitude.toString(),
            longitude: longitude.toString()
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Return empty location object if user denies or error occurs
        resolve({
          address: '',
          city: '',
          countryCode: '',
          latitude: '',
          longitude: ''
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

export default function CreateAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const provider = location.state?.provider?.toLowerCase() || '';
  const prefilledName = location.state?.name || '';
  const prefilledEmail = location.state?.email || '';
  const hidePasswordFields = ['google', 'facebook', 'phone'].includes(provider);
  const lockEmailField = ['google', 'facebook'].includes(provider) && !!prefilledEmail;
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: prefilledName,
    email: prefilledEmail,
    // countryCode: '+91', // Commented out - phone number field removed
    // mobile: '', // Commented out - phone number field removed
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    genderPreference: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);


  // Require consent acceptance before accessing this page
  React.useEffect(() => {
    const accepted = sessionStorage.getItem('consentAccepted') === 'true';
    if (!accepted) {
      navigate('/consent', { replace: true, state: location.state });
    }
  }, [navigate, location.state]);

  React.useEffect(() => {
    if (prefilledName || prefilledEmail) {
      setFormData(prev => ({
        ...prev,
        fullName: prefilledName || prev.fullName,
        email: prefilledEmail || prev.email
      }));
    }
  }, [prefilledName, prefilledEmail]);
  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Phone number validation - commented out
    // if (!formData.mobile.trim()) {
    //   newErrors.mobile = 'Mobile number is required';
    // } else if (!/^\d{7,15}$/.test(formData.mobile.replace(/\D/g, ''))) {
    //   newErrors.mobile = 'Mobile number must be 7-15 digits';
    // }

    if (!hidePasswordFields) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const today = new Date();
      const birthDate = new Date(formData.dateOfBirth);
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    if (!formData.genderPreference) {
      newErrors.genderPreference = 'Please select gender preference';
    }
    // Education and Day Job are collected in Profile Setup

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if email already exists (phone check commented out)
  const checkExistingUser = async (email) => {
    try {
      // Check email
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '==', email.trim().toLowerCase())
      );
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        return { exists: true, type: 'email' };
      }

      // Phone number check - commented out
      // const phoneQuery = query(
      //   collection(db, 'users'),
      //   where('phoneNumber', '==', phoneNumber)
      // );
      // const phoneSnapshot = await getDocs(phoneQuery);
      // if (!phoneSnapshot.empty) {
      //   return { exists: true, type: 'phone' };
      // }

      return { exists: false };
    } catch (error) {
      console.error('Error checking existing user:', error);
      throw error;
    }
  };

  // Generate userId from RegisteredUsers collection
  const generateUserId = async () => {
    try {
      // ✅ Correct path
      const counterRef = doc(db, 'users', 'RegisteredUsers');

      const userId = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(counterRef);

        if (!snapshot.exists()) {
          throw new Error('RegisteredUsers counter document not found');
        }

        const currentCount = snapshot.data().totalCount || 0;

        // ✅ increment ONCE
        const newCount = currentCount + 1;

        // ✅ generate ID from SAME value
        const newUserId = `YBE${String(newCount).padStart(8, '0')}`;

        // ✅ update SAME document
        transaction.update(counterRef, {
          totalCount: newCount
        });

        return newUserId;
      });

      return userId;
    } catch (error) {
      console.error('Error generating userId:', error);
      throw error;
    }
  };


  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix all errors before submitting', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // Combine country code with mobile number - commented out
      // const fullPhoneNumber = `${formData.countryCode}${formData.mobile.trim()}`;

      // Check if user already exists
      const existingUser = await checkExistingUser(formData.email);
      // const existingUser = await checkExistingUser(formData.email, fullPhoneNumber); // With phone check

      if (existingUser.exists) {
        if (existingUser.type === 'email') {
          setErrors({ email: 'This email is already registered' });
          toast.error('This email is already registered. Please use a different email or sign in.', {
            position: "top-right",
            autoClose: 4000,
          });
        }
        // Phone error handling - commented out
        // else if (existingUser.type === 'phone') {
        //   setErrors({ mobile: 'This mobile number is already registered' });
        //   toast.error('This mobile number is already registered. Please use a different number or sign in.', {
        //     position: "top-right",
        //     autoClose: 4000,
        //   });
        // }
        setLoading(false);
        return;
      }

      let authUser = auth.currentUser;
      if (!hidePasswordFields) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );
        authUser = userCredential.user;
      }

      if (!authUser?.uid) {
        throw new Error('Authentication session expired. Please login again.');
      }

      // Generate userId from RegisteredUsers
      const userId = await generateUserId();
      const currentDate = new Date().toISOString().split('T')[0];

      // Get current location
      let currentPosition = {
        address: "",
        city: "",
        countryCode: "",
        latitude: "",
        longitude: ""
      };

      try {
        currentPosition = await getCurrentLocation();
        console.log('Location retrieved:', currentPosition);
      } catch (error) {
        console.warn('Could not get location:', error);
        // Continue with empty location if user denies or error occurs
      }

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        authUid: authUser.uid,
        provider: provider || "email",
        phoneNumber: location.state?.phone || authUser.phoneNumber || "",
        // phoneNumber: fullPhoneNumber, // Commented out - phone number field removed
        dateOfBirth: formData.dateOfBirth,
        userGender: formData.gender,
        userId: userId,
        aboutMe: "",
        blockedUsers: [],
        bodyBuild: "",
        community: "",
        country: "",
        createdAt: new Date(),
        createdFor: "",
        currentDiscountPercentage: 0,
        currentPosition: currentPosition,
        dailyLimit: {
          date: currentDate,
          profileViewCount: 0,
          swipeCount: 0
        },
        dayJob: "",
        degree: "",
        doj: currentDate,
        fcmToken: "",
        genderPreference: formData.genderPreference,
        growUpCountry: "",
        height: "",
        isDisabled: false,
        isFirstTimeSubscription: false,
        location: "",
        lookingFor: "",
        motherTongue: "",
        notificationStatus: true,
        onlineStatus: false,
        originCountry: "",
        profileDiscovery: true,
        profileImageUrls: [],
        referrals: [],
        referrerUserId: "",
        religion: "",
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
          drink: "",
          eveningRoutine: [],
          exercise: "",
          passions: [],
          personalityType: "",
          pets: [],
          poison: [],
          smoke: "",
          starSign: "",
          tripsType: [],
          weatherType: [],
          weekendActivities: [],
          weekendNight: []
        },
        settledCountry: "",
        status: "",
        subscriptions: {
          availedBoost: 0,
          boostedUntil: null,
          planName: "Free",
          validUntil: null
        }
      });

      console.log('User account created successfully:', userId);

      // Set success state to show loading overlay immediately
      // setSignupSuccess(true);
      // setLoading(true);

      // // Show success message
      // toast.success('Account created successfully!', {
      //   position: "top-right",
      //   autoClose: 2000,
      // });
      // Stop button loading
      setLoading(false);

      // Show full screen success loader
      setSignupSuccess(true);

      sessionStorage.removeItem('socialAuthFlowInProgress');

      // Navigate after short delay
      setTimeout(() => {
        navigate('/profile-setup', { replace: true });
      }, 1500);


    } catch (error) {
      console.error('Sign up error:', error);

      switch (error.code) {
        case 'auth/email-already-in-use':
          setErrors({ email: 'This email is already registered' });
          toast.error('Email already in use. Please use a different email.');
          break;
        case 'auth/invalid-email':
          setErrors({ email: 'Invalid email address' });
          toast.error('Invalid email address.');
          break;
        case 'auth/weak-password':
          setErrors({ password: 'Password is too weak' });
          toast.error('Password is too weak. Please use a stronger password.');
          break;
        case 'auth/network-request-failed':
          toast.error('Network error. Please check your connection.');
          break;
        default:
          toast.error('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="create-account-page">
      {/* Success overlay with loading */}
      {signupSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          color: '#fff'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '30px'
          }}>
            <div style={{
              fontSize: '48px',
              color: '#4CAF50',
              marginBottom: '20px'
            }}>✓</div>
            <h2 style={{ marginBottom: '15px', fontSize: '24px' }}>Account Created Successfully!</h2>
            <p style={{ marginBottom: '30px', fontSize: '16px', opacity: 0.9 }}>
              Setting up your profile...
            </p>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid #fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}

      <header className="ca-header">
        <div className="logo">
          <img src="/images/logo.png" alt="Ibe Logo" className="logo-img" />
        </div>
      </header>

      <div className="ca-container">
        <div className="ca-card">
          <button className="back-btn" onClick={handleBack} disabled={loading}>
            ←
          </button>

          <h2 className="ca-title">Create Account</h2>
          <p className="ca-subtitle">Start your journey to find love</p>

          <div className="ca-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Enter your full name"
                disabled={loading}
              />
              {errors.fullName && (
                <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                  {errors.fullName}
                </span>
              )}
            </div>

            <div className="form-group">
              <div>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading || lockEmailField}
                />
                {errors.email && (
                  <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    {errors.email}
                  </span>
                )}
              </div>
            </div>

            {/* Phone Number Field - Commented out
            <div className="form-group">
              <div>
                <label className="form-label">Mobile Number</label>
                <div className="phone-input-wrapper">
                  <select
                    className="country-code-select"
                    value={formData.countryCode}
                    onChange={(e) => handleChange('countryCode', e.target.value)}
                    disabled={loading}
                  >
                    {COUNTRIES_DATA.map((country) => (
                      <option key={country.code} value={country.dial_code}>
                        {country.dial_code} - {country.code}
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    className="phone-number-input"
                    placeholder="Enter mobile number"
                    value={formData.mobile}
                    onChange={(e) =>
                      handleChange('mobile', e.target.value.replace(/\D/g, ''))
                    }
                    disabled={loading}
                  />
                </div>

                {errors.mobile && (
                  <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    {errors.mobile}
                  </span>
                )}
              </div>
            </div>
            */}

            {!hidePasswordFields && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <div style={{ position: 'relative' }}>
                  <label className="form-label">Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Enter password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '43px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    <img
                      src={showPassword ? '/images/hidden.png' : '/images/show.png'}
                      alt={showPassword ? 'Hide password' : 'Show password'}
                      style={{ width: '20px', height: '20px' }}
                    />
                  </button>
                  {errors.password && (
                    <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                      {errors.password}
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <label className="form-label">Confirm Password</label>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Confirm password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '43px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    <img
                      src={showConfirmPassword ? '/images/hidden.png' : '/images/show.png'}
                      alt={showConfirmPassword ? 'Hide password' : 'Show password'}
                      style={{ width: '20px', height: '20px' }}
                    />
                  </button>
                  {errors.confirmPassword && (
                    <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                      {errors.confirmPassword}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div>
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  disabled={loading}
                  max={getMaxDate()}
                />
                {errors.dateOfBirth && (
                  <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    {errors.dateOfBirth}
                  </span>
                )}
              </div>

              <div>
                <label className="form-label">Gender</label>
                <select
                  className="form-input"
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  disabled={loading}
                  style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && (
                  <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    {errors.gender}
                  </span>
                )}
              </div>
              <div>
                <label className="form-label">Gender Preference</label>
                <select
                  className="form-input"
                  value={formData.genderPreference}
                  onChange={(e) => handleChange('genderPreference', e.target.value)}
                  disabled={loading}
                  style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  <option value="">Select Preference</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Everyone">Everyone</option>
                </select>

                {errors.genderPreference && (
                  <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    {errors.genderPreference}
                  </span>
                )}
              </div>

            </div>

            {/* Highest Education & Day Job will be handled in Profile Setup */}

            <button
              onClick={handleSubmit}
              className="signup-submit-btn"
              disabled={loading}
              style={{
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating Account...' : 'Sign up'}
            </button>

            <p className="signin-link">
              Already have an account? <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Sign In</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
