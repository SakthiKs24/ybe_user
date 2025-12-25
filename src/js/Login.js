import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { auth, db , googleProvider} from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/Login.css';
import { signInWithPopup } from "firebase/auth";

export default function Login({ isOpen, onClose }) {
  const navigate = useNavigate(); 
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
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
      setLoading(false);
    }
  };
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
  
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
  
      console.log("Google user:", user.uid);
  
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
  
      // ✅ IF USER EXISTS → LOGIN
      if (userDoc.exists()) {
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
      setLoading(false);
    }
  };
  
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button 
            onClick={handleSubmit} 
            className="login-btn"
            disabled={loading}
            style={{
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
          <div className="social-login">
            <button
              className="social-btn google"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <img
                src="/images/google.png"
                alt="Google"
              />
            </button>

            <button className="social-btn facebook" >
              <img
                src="/images/fb.png"
                alt="Facebook"
                className="social-icon"
              />
            </button>

            <button className="social-btn phone" >
              <img
                src="/images/phone.png"
                alt="Facebook"
                className="social-icon"
              />
            </button>
          </div>

          <p className="signup-link">
            New to Platform? <a href="/signup">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}