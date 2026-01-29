import React, { useState } from 'react';
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

        toast.success('Login successful! Redirecting to dashboard...', {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        // Close modal and navigate using React Router
        setTimeout(() => {
          onClose();
          navigate('/dashboard');
        }, 1500);
      } else {
        // Try to find user by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const foundDoc = querySnapshot.docs[0];
          // Update user location
          await updateUserLocation(foundDoc.id);
        }
        
        console.log('No user document found in Firestore');
        onClose();
        navigate('/dashboard');
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
        // Update user location
        await updateUserLocation(user.uid);

        // Set onlineStatus to true
        await updateDoc(userDocRef, {
          onlineStatus: true
        });

        toast.success("Login successful!", {
          position: "top-right",
          autoClose: 2000,
        });

        setTimeout(() => {
          onClose();
          navigate("/dashboard");
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
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoadingSocial(false);
    }
  };

  /* ---------------- PHONE LOGIN ---------------- */

  const fullPhoneNumber = `${country.dial_code}${phone}`;

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container", // container ID or element
        {
          size: "invisible",
          callback: () => {
            console.log("reCAPTCHA solved");
          },
          "expired-callback": () => {
            console.log("reCAPTCHA expired");
          },
        },
        auth // ✅ third argument is auth
      );
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
      // if (!window.recaptchaVerifier) {
      //   window.recaptchaVerifier = new RecaptchaVerifier(
      //     auth,
      //     "recaptcha-container",
      //     {
      //       size: "invisible",
      //       callback: () => {
      //         console.log("reCAPTCHA solved");
      //       },
      //       "expired-callback": () => {
      //         console.log("reCAPTCHA expired");
      //       },
      //     }
      //   );
      // }
      setupRecaptcha();

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

      setError(err.message || "Failed to send OTP");
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

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        // Update user location
        await updateUserLocation(user.uid);

        // Set onlineStatus to true
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          onlineStatus: true
        });

        toast.success("Login successful!");
        onClose();
        navigate("/dashboard");
      } else {
        toast.info("Complete signup");
        onClose();
        navigate("/create-account", {
          state: {
            phone: user.phoneNumber,
            uid: user.uid,
            provider: "phone",
          },
        });
      }
    } catch {
      setError("Invalid OTP");
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
      setError("Facebook sign-in failed. Please try again.");
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
                <div id="recaptcha-container"></div>
              </div>
              <p className="signup-link">
                New to Platform? <a href="/create-account">Sign up</a>
              </p>
            </>
          )}
          {/* PHONE LOGIN */}
          {showPhoneLogin && (
            <>
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