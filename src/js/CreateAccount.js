import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/CreateAccount.css';
import Navbar from './Navbar';

export default function CreateAccount() {
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Mobile validation
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Mobile number must be 10 digits';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Date of Birth validation
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

    // Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateUserId = async () => {
    // Generate a random user ID 
    const randomNum = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `YBE${randomNum}`;
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
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      const user = userCredential.user;
      const userId = await generateUserId();
      const currentDate = new Date().toISOString().split('T')[0]; 

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        // User provided data
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.mobile.trim(),
        dateOfBirth: formData.dateOfBirth,
        userGender: formData.gender,
        userId: userId,
        
        // Default values
        aboutMe: "",
        blockedUsers: [],
        bodyBuild: "",
        community: "",
        country: "",
        createdAt: new Date(),
        currentDiscountPercentage: 0,
        currentPosition: {
          address: "",
          city: "",
          countryCode: "",
          latitude: "",
          longitude: ""
        },
        dailyLimit: {
          date: currentDate,
          profileViewCount: 0,
          swipeCount: 0
        },
        dayJob: "",
        degree: "",
        doj: currentDate,
        fcmToken: "",
        genderPreference: "",
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

      // Show success toast
      toast.success('Account created successfully! Redirecting to dashboard...', {
        position: "top-right",
        autoClose: 2000,
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Sign up error:', error);
      
      // Handle specific Firebase auth errors
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
      {/* <Navbar onLoginClick={() => setIsLoginOpen(true)} /> */}

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

           
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading}
                />
                {errors.email && (
                  <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    {errors.email}
                  </span>
                )}
              </div>

              <div>
                <label className="form-label">Mobile Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value)}
                  placeholder="Enter mobile number"
                  disabled={loading}
                />
                {errors.mobile && (
                  <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    {errors.mobile}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Enter password"
                  disabled={loading}
                />
                {errors.password && (
                  <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    {errors.password}
                  </span>
                )}
              </div>

              <div>
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Confirm password"
                  disabled={loading}
                />
                {errors.confirmPassword && (
                  <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    {errors.confirmPassword}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div>
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  disabled={loading}
                  max={new Date().toISOString().split('T')[0]}
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
            </div>

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