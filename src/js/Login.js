import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider, facebookProvider } from '../firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/Login.css';
import { COUNTRIES_DATA } from "../js/countriesData.js";
import { isMandatoryComplete } from '../utils/mandatoryFields';

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

// Helper function to update user location
const updateUserLocation = async (userId) => {
  try {
    const currentPosition = await getCurrentLocation();
    console.log('Location retrieved:', currentPosition);
    
    // Try to find user by userId first
    let userDocRef = doc(db, 'users', userId);
    let userDoc = await getDoc(userDocRef);
    
    // If user not found by userId, try to find by email
    if (!userDoc.exists()) {
      const user = auth.currentUser;
      if (user && user.email) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const foundDoc = querySnapshot.docs[0];
          userDocRef = doc(db, 'users', foundDoc.id);
        }
      }
    }
    
    await updateDoc(userDocRef, {
      currentPosition: currentPosition
    });
    
    console.log('User location updated successfully');
  } catch (error) {
    console.error('Error updating user location:', error);
    // Don't throw - location update failure shouldn't block login
  }
};

export default function Login({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [country, setCountry] = useState(COUNTRIES_DATA.find(c => c.code === "IN"));
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState('');
const [loadingEmail, setLoadingEmail] = useState(false);
const [loadingSocial, setLoadingSocial] = useState(false);

  // Clean up reCAPTCHA when phone login section is closed
  // Must be before early return to follow React Hooks rules
  useEffect(() => {
    if (!showPhoneLogin) {
      // Clean up verifier when phone login is closed
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.warn("Error clearing verifier:", e);
        }
        window.recaptchaVerifier = null;
      }
      
      // Clear the container element
      const container = document.getElementById("recaptcha-container");
      if (container) {
        container.innerHTML = '';
      }
    }
  }, [showPhoneLogin]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }

setLoadingEmail(true);
    setError('');

    try {
      console.log('Attempting login with email:', formData.email);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      const user = userCredential.user;
      console.log('User logged in:', user.uid);

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('User data from Firestore:', userData);

        // Update user location
        await updateUserLocation(user.uid);

        // Set onlineStatus to true
        await updateDoc(userDocRef, {
          onlineStatus: true
        });

        // Check if mandatory fields are complete
        const mandatoryComplete = isMandatoryComplete(userData);

        toast.success('Login successful!', {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        // Close modal and navigate based on mandatory fields completion
        setTimeout(() => {
          onClose();
          if (mandatoryComplete) {
            navigate('/dashboard');
          } else {
            navigate('/profile');
          }
        }, 1500);
      } else {
        // Try to find user by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const foundDoc = querySnapshot.docs[0];
          const userData = foundDoc.data();
          
          // Update user location
          await updateUserLocation(foundDoc.id);
          
          // Check mandatory fields
          const mandatoryComplete = isMandatoryComplete(userData);
          
          onClose();
          if (mandatoryComplete) {
            navigate('/dashboard');
          } else {
            navigate('/profile');
          }
        } else {
          console.log('No user document found in Firestore');
          onClose();
          navigate('/profile');
        }
      }

    } catch (error) {
      console.error('Login error:', error);

      switch (error.code) {
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password.');
          break;
        case 'auth/invalid-credential':
          setError('Invalid email or password.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        default:
          setError('Login failed. Please try again.');
      }
    } finally {
      setLoadingEmail(false);
    }
  };
  const handleGoogleLogin = async () => {
    setLoadingSocial(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log("Google user:", user.uid);

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      // ✅ IF USER EXISTS → LOGIN
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Update user location
        await updateUserLocation(user.uid);

        // Set onlineStatus to true
        await updateDoc(userDocRef, {
          onlineStatus: true
        });

        // Check if mandatory fields are complete
        const mandatoryComplete = isMandatoryComplete(userData);

        toast.success("Login successful!", {
          position: "top-right",
          autoClose: 2000,
        });

        setTimeout(() => {
          onClose();
          // Navigate based on mandatory fields completion
          if (mandatoryComplete) {
            navigate("/dashboard");
          } else {
            navigate("/profile");
          }
        }, 1500);
      }
      // IF USER DOES NOT EXIST → REDIRECT TO SIGNUP
      else {
        console.log("User not found. Redirecting to signup.");

        toast.info("Please complete signup to continue", {
          position: "top-right",
          autoClose: 2000,
        });

        setTimeout(() => {
          onClose();
          navigate("/create-account", {
            state: {
              email: user.email,
              name: user.displayName,
              photoURL: user.photoURL,
              provider: "google",
              uid: user.uid,
            },
          });
        }, 1500);
      }

    } catch (error) {
      console.error("Google login error:", error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/invalid-app-credential') {
        setError("Google sign-in configuration error. Please contact support.");
        toast.error("Authentication configuration issue. Please check Firebase Console settings.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError("Sign-in popup was closed. Please try again.");
      } else if (error.code === 'auth/popup-blocked') {
        setError("Popup was blocked. Please allow popups for this site.");
      } else {
        setError(error.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setLoadingSocial(false);
    }
  };

  /* ---------------- PHONE LOGIN ---------------- */

  const fullPhoneNumber = `${country.dial_code}${phone}`;

  const setupRecaptcha = () => {
    // Ensure the container exists
    const container = document.getElementById("recaptcha-container");
    if (!container) {
      const errorMsg = "reCAPTCHA container not found. Please ensure phone login form is visible.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Clear existing verifier if it exists
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.warn("Error clearing existing verifier:", e);
      }
      window.recaptchaVerifier = null;
    }

    // Clear the container to remove any existing reCAPTCHA widgets
    container.innerHTML = '';

    try {
      // Firebase v9+ RecaptchaVerifier signature: (auth, containerId, options)
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth, // ✅ First argument is auth
        "recaptcha-container", // container ID or element
        {
          size: "invisible",
          callback: () => {
            console.log("reCAPTCHA solved");
          },
          "expired-callback": () => {
            console.log("reCAPTCHA expired");
            // Reset verifier on expiry
            if (window.recaptchaVerifier) {
              try {
                window.recaptchaVerifier.clear();
              } catch (e) {
                console.warn("Error clearing expired verifier:", e);
              }
            }
            window.recaptchaVerifier = null;
          },
        }
      );
      console.log("RecaptchaVerifier initialized successfully");
    } catch (error) {
      console.error("Error setting up RecaptchaVerifier:", error);
      // Clean up on error
      window.recaptchaVerifier = null;
      throw error;
    }
  };

  const sendOtp = async () => {
    if (!phone) {
      setError("Enter phone number with country code");
      return;
    }

    setLoadingSocial(true);
    setError("");

    try {
      // Setup reCAPTCHA verifier
      setupRecaptcha();

      // Verify verifier was created successfully
      if (!window.recaptchaVerifier) {
        throw new Error("Failed to initialize reCAPTCHA. Please refresh the page and try again.");
      }

      console.log("FULL PHONE:", fullPhoneNumber);
      console.log("AUTH OBJECT:", auth);

      console.log("Sending OTP to:", fullPhoneNumber);

      const result = await signInWithPhoneNumber(
        auth,
        fullPhoneNumber,
        window.recaptchaVerifier
      );

      setConfirmationResult(result);
      toast.success("OTP sent successfully");
    } catch (err) {
      console.log("Sending OTP to:", fullPhoneNumber);
      console.error("OTP ERROR FULL OBJECT:", err);
      console.error("OTP ERROR CODE:", err.code);
      console.error("OTP ERROR MESSAGE:", err.message);

      // Reset verifier on error so it can be recreated
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (clearError) {
          console.warn("Error clearing recaptcha verifier:", clearError);
        }
        window.recaptchaVerifier = null;
      }
      
      // Clear the container element to allow re-initialization
      const container = document.getElementById("recaptcha-container");
      if (container) {
        container.innerHTML = '';
      }

      const errorMessage = err.message || err.code || "Failed to send OTP. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingSocial(false);
    }
  };


  const verifyOtp = async () => {
    if (!otp || !confirmationResult) return;

    setLoadingSocial(true);
    setError("");

    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      const phoneNumber = user.phoneNumber || fullPhoneNumber;

      // First, check if user document exists by Firebase Auth UID
      let userDoc = await getDoc(doc(db, "users", user.uid));
      let userId = user.uid;

      // If not found by UID, check if phone number exists in Firestore
      if (!userDoc.exists() && phoneNumber) {
        console.log("User not found by UID, checking by phone number:", phoneNumber);
        const usersRef = collection(db, "users");
        const phoneQuery = query(usersRef, where("phoneNumber", "==", phoneNumber));
        const phoneSnapshot = await getDocs(phoneQuery);

        if (!phoneSnapshot.empty) {
          // Found user by phone number - use that document
          const foundDoc = phoneSnapshot.docs[0];
          userDoc = { exists: () => true, data: () => foundDoc.data(), id: foundDoc.id };
          userId = foundDoc.id;
          console.log("Found existing user by phone number:", userId);

          // Optionally link the Firebase Auth UID to the existing document
          // This allows future logins to work by UID
          try {
            await updateDoc(doc(db, "users", userId), {
              authUid: user.uid, // Store auth UID for future reference
              updatedAt: new Date()
            });
          } catch (updateError) {
            console.warn("Could not update user document with auth UID:", updateError);
            // Continue anyway - login will still work
          }
        }
      }

      // ✅ IF USER EXISTS → LOGIN
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Update user location
        await updateUserLocation(userId);

        // Set onlineStatus to true
        const userDocRef = doc(db, "users", userId);
        await updateDoc(userDocRef, {
          onlineStatus: true
        });

        // Check if mandatory fields are complete
        const mandatoryComplete = isMandatoryComplete(userData);

        toast.success("Login successful!", {
          position: "top-right",
          autoClose: 2000,
        });

        setTimeout(() => {
          onClose();
          // Navigate based on mandatory fields completion
          if (mandatoryComplete) {
            navigate("/dashboard");
          } else {
            navigate("/profile");
          }
        }, 1500);
      }
      // IF USER DOES NOT EXIST → REDIRECT TO SIGNUP
      else {
        console.log("User not found. Redirecting to signup.");

        toast.info("Please complete signup to continue", {
          position: "top-right",
          autoClose: 2000,
        });

        setTimeout(() => {
          onClose();
          navigate("/create-account", {
            state: {
              phone: phoneNumber,
              uid: user.uid,
              provider: "phone",
            },
          });
        }, 1500);
      }
    } catch (error) {
      console.error("Phone login error:", error);
      setError(error.message || "Phone login failed. Please try again.");
      toast.error(error.message || "Phone login failed. Please try again.");
    } finally {
      setLoadingSocial(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoadingSocial(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const user = result.user;

      console.log("Facebook user:", user.uid);

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Update user location
        await updateUserLocation(user.uid);

        // Set onlineStatus to true
        await updateDoc(userDocRef, {
          onlineStatus: true
        });

        toast.success("Login successful!", { autoClose: 2000 });
        setTimeout(() => {
          onClose();
          navigate("/dashboard");
        }, 1500);
      } else {
        toast.info("Please complete signup", { autoClose: 2000 });
        setTimeout(() => {
          onClose();
          navigate("/create-account", {
            state: {
              email: user.email,
              name: user.displayName,
              photoURL: user.photoURL,
              provider: "facebook",
              uid: user.uid,
            },
          });
        }, 1500);
      }
    } catch (error) {
      console.error("Facebook login error:", error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/invalid-app-credential') {
        setError("Facebook sign-in configuration error. Please contact support.");
        toast.error("Authentication configuration issue. Please check Firebase Console settings.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError("Sign-in popup was closed. Please try again.");
      } else if (error.code === 'auth/popup-blocked') {
        setError("Popup was blocked. Please allow popups for this site.");
      } else {
        setError(error.message || "Facebook sign-in failed. Please try again.");
      }
    } finally {
      setLoadingSocial(false);
    }
  };



  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content1" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <h2 className="modal-title">Login</h2>
        <p className="modal-subtitle">Start your journey to find love</p>

        <div className="login-form">
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '12px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '14px',
              border: '1px solid #fecaca',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {!showPhoneLogin && (
            <><div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your email"
                disabled={loadingEmail}
              />
            </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your password"
                    disabled={loadingEmail}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '14px',
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
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="login-btn"
                disabled={loadingEmail}
                style={{
                  opacity: loadingEmail ? 0.7 : 1,
                  cursor: loadingEmail ? 'not-allowed' : 'pointer'
                }}
              >
                {loadingEmail ? 'Logging in...' : 'Log in'}
              </button>

              <div className="social-login">
                <button
                  className="social-btn google"
                  onClick={handleGoogleLogin}
                  disabled={loadingSocial}
                >
                  <img
                    src="/images/google.png"
                    alt="Google"
                  />
                </button>

                <button
                  className="social-btn facebook"
                  onClick={handleFacebookLogin}
                  disabled={loadingSocial}
                >
                  <img
                    src="/images/fb.png"
                    alt="Facebook"
                    className="social-icon"
                  />
                </button>


                <button className="social-btn phone" onClick={() => setShowPhoneLogin(!showPhoneLogin)} disabled={loadingSocial} >
                  <img
                    src="/images/phone.png"
                    alt="Phone"
                    className="social-icon"
                  />
                </button>
              </div>
              <p className="signup-link">
                New to Platform? <a href="/create-account">Sign up</a>
              </p>
            </>
          )}
          {/* PHONE LOGIN */}
          {showPhoneLogin && (
            <>
              {/* reCAPTCHA container - must be rendered when phone login is shown */}
              <div id="recaptcha-container"></div>
              {!confirmationResult ? (
                <div className="form-group">
                  <label className="form-label">Phone Number</label>

                  <div className="phone-input-wrapper">
                    <select
                      className="phone-country-select"
                      value={country.code}
                      onChange={(e) =>
                        setCountry(
                          COUNTRIES_DATA.find(c => c.code === e.target.value)
                        )
                      }
                    >
                      {COUNTRIES_DATA.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.dial_code} - {c.code}
                        </option>
                      ))}
                    </select>

                    <input
                      type="tel"
                      className="phone-number-input"
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loadingSocial}
                    />
                  </div>
                  <br></br>
                  <button
                    className="login-btn"
                    onClick={sendOtp}
                    disabled={loadingSocial}
                  >
                    Send OTP
                  </button>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Enter OTP</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loadingSocial}
                  />

                  <button
                    className="login-btn"
                    onClick={verifyOtp}
                    disabled={loadingSocial}
                  >
                    Verify OTP
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}