import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Replace your existing useEffect with this improved version
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData({
              uid: user.uid,
              email: user.email,
              ...userDoc.data()
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        // No user logged in, redirect to home
        navigate('/');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
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

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          fontSize: '24px',
          color: 'white',
          fontWeight: '600'
        }}>
          Loading...
        </div>
      </div>
      
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '700',
          color: 'white',
          margin: 0
        }}>
          Dashboard
        </h1>
        <button
  onClick={() => setShowLogoutModal(true)}
  style={{
    padding: '12px 30px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '2px solid white',
    borderRadius: '50px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }}
>
  Logout
</button>

      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Welcome Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '10px'
          }}>
            Welcome back, {userData?.name || 'User'}! 👋
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '30px'
          }}>
            Here's what's happening with your dating journey today.
          </p>

          {/* User Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '15px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Email</div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{userData?.email || 'N/A'}</div>
            </div>

            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '15px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>User ID</div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{userData?.uid?.substring(0, 8) || 'N/A'}...</div>
            </div>

            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '15px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Status</div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>Active</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '25px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '10px'
            }}>💝</div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#333',
              marginBottom: '5px'
            }}>12</div>
            <div style={{
              fontSize: '16px',
              color: '#666'
            }}>Matches</div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '10px'
            }}>💬</div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#333',
              marginBottom: '5px'
            }}>8</div>
            <div style={{
              fontSize: '16px',
              color: '#666'
            }}>Messages</div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '10px'
            }}>👀</div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#333',
              marginBottom: '5px'
            }}>45</div>
            <div style={{
              fontSize: '16px',
              color: '#666'
            }}>Profile Views</div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '10px'
            }}>⭐</div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#333',
              marginBottom: '5px'
            }}>23</div>
            <div style={{
              fontSize: '16px',
              color: '#666'
            }}>Likes Received</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '25px'
          }}>
            Recent Activity
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {[
              { icon: '💝', text: 'You matched with Sarah', time: '2 hours ago' },
              { icon: '💬', text: 'New message from Alex', time: '5 hours ago' },
              { icon: '👀', text: 'Your profile was viewed 5 times', time: '1 day ago' },
              { icon: '⭐', text: 'You received 3 new likes', time: '2 days ago' }
            ].map((activity, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '20px',
                background: '#f8f9fa',
                borderRadius: '15px',
                transition: 'all 0.3s'
              }}>
                <div style={{ fontSize: '32px', marginRight: '20px' }}>
                  {activity.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '5px'
                  }}>
                    {activity.text}
                  </div>
                  <div style={{ fontSize: '14px', color: '#999' }}>
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
        {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '15px',
            width: '90%',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#333' }}>
              Confirm Logout
            </h3>

            <p style={{ color: '#666', marginBottom: '25px' }}>
              Are you sure you want to logout?
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '30px',
                  border: '1px solid #ccc',
                  background: '#f1f1f1',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '30px',
                  border: 'none',
                  background: '#667eea',
                  color: 'white',
                  cursor: 'pointer'
                }}
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