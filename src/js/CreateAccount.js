import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/CreateAccount.css';
import Navbar from './Navbar';
import { COUNTRIES_DATA } from '../js/countriesData';

export default function CreateAccount() {
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    countryCode: '+91',
    mobile: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    genderPreference: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^\d{7,15}$/.test(formData.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Mobile number must be 7-15 digits';
    }

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if email or phone already exists
  const checkExistingUser = async (email, phoneNumber) => {
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

      // Check phone number
      const phoneQuery = query(
        collection(db, 'users'),
        where('phoneNumber', '==', phoneNumber)
      );
      const phoneSnapshot = await getDocs(phoneQuery);

      if (!phoneSnapshot.empty) {
        return { exists: true, type: 'phone' };
      }

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
      // Combine country code with mobile number
      const fullPhoneNumber = `${formData.countryCode}${formData.mobile.trim()}`;

      // Check if user already exists
      const existingUser = await checkExistingUser(formData.email, fullPhoneNumber);

      if (existingUser.exists) {
        if (existingUser.type === 'email') {
          setErrors({ email: 'This email is already registered' });
          toast.error('This email is already registered. Please use a different email or sign in.', {
            position: "top-right",
            autoClose: 4000,
          });
        } else if (existingUser.type === 'phone') {
          setErrors({ mobile: 'This mobile number is already registered' });
          toast.error('This mobile number is already registered. Please use a different number or sign in.', {
            position: "top-right",
            autoClose: 4000,
          });
        }
        setLoading(false);
        return;
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      const user = userCredential.user;

      // Generate userId from RegisteredUsers
      const userId = await generateUserId();
      const currentDate = new Date().toISOString().split('T')[0];

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: fullPhoneNumber,
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

      toast.success('Account created successfully!', {
        position: "top-right",
        autoClose: 2000,
      });

      setTimeout(() => {
        navigate('/profile-setup');
      }, 2000);

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
                  disabled={loading}
                />
                {errors.email && (
                  <span style={{ color: '#FF027D', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    {errors.email}
                  </span>
                )}
              </div>
            </div>

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
                        {country.dial_code}
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