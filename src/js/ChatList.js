import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import ChatTile from './ChatTile';
import ChatDetail from './ChatDetail';
import ChatService from './services/chatService';
import '../css/ChatList.css';

export default function ChatList() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [chatList, setChatList] = useState([]);
  const [filteredChatList, setFilteredChatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(chatId || null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Update selectedChatId when URL changes
  useEffect(() => {
    if (chatId) {
      setSelectedChatId(chatId);
    }
  }, [chatId]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDetailsStr = localStorage.getItem('userDetails');
          if (userDetailsStr) {
            const parsed = JSON.parse(userDetailsStr);
            if (!parsed.userId && user.uid) {
              parsed.userId = user.uid;
            }
            setUserDetails(parsed);
            console.log('User details from localStorage:', parsed);
          } else {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = { userId: user.uid, ...userDoc.data() };
              setUserDetails(userData);
              localStorage.setItem('userDetails', JSON.stringify(userData));
              console.log('User details from Firestore:', userData);
            } else {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', user.email));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = { userId: userDoc.id, ...userDoc.data() };
                setUserDetails(userData);
                localStorage.setItem('userDetails', JSON.stringify(userData));
                console.log('User details found by email:', userData);
              } else {
                console.error('User not found in Firestore');
              }
            }
          }
        } catch (error) {
          console.error('Error getting user details:', error);
        }
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch chat list
  useEffect(() => {
    if (!userDetails?.userId) {
      console.log('Waiting for userDetails...', userDetails);
      return;
    }

    console.log('Fetching chats for userId:', userDetails.userId);

    const chatsRef = collection(db, 'chats');
    
    let q;
    try {
      q = query(
        chatsRef,
        where('chatUserData.participants', 'array-contains', userDetails.userId),
        orderBy('chatUserData.lastMessageSentAt', 'desc')
      );
    } catch (error) {
      console.warn('Query with orderBy failed, trying without orderBy:', error);
      q = query(
        chatsRef,
        where('chatUserData.participants', 'array-contains', userDetails.userId)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Chats snapshot received:', snapshot.docs.length, 'chats');
      
      const chats = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Chat data:', doc.id, data);
        return {
          chatId: doc.id,
          chatUserData: data.chatUserData || data || {}
        };
      });

      chats.sort((a, b) => {
        const timeA = a.chatUserData.lastMessageSentAt?.toDate?.() || new Date(0);
        const timeB = b.chatUserData.lastMessageSentAt?.toDate?.() || new Date(0);
        return timeB - timeA;
      });

      console.log('Processed chats:', chats.length);
      setChatList(chats);
      setFilteredChatList(chats);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching chats:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log('Retrying query without orderBy...');
        const qWithoutOrder = query(
          chatsRef,
          where('chatUserData.participants', 'array-contains', userDetails.userId)
        );
        
        const retryUnsubscribe = onSnapshot(qWithoutOrder, (snapshot) => {
          const chats = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              chatId: doc.id,
              chatUserData: data.chatUserData || data || {}
            };
          });

          chats.sort((a, b) => {
            const timeA = a.chatUserData.lastMessageSentAt?.toDate?.() || new Date(0);
            const timeB = b.chatUserData.lastMessageSentAt?.toDate?.() || new Date(0);
            return timeB - timeA;
          });

          setChatList(chats);
          setFilteredChatList(chats);
          setLoading(false);
        }, (retryError) => {
          console.error('Retry also failed:', retryError);
          setLoading(false);
        });
        
        return () => retryUnsubscribe();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [userDetails]);

  // Filter chats by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChatList(chatList);
      return;
    }

    const filtered = ChatService.filterChatsByUserName(chatList, searchQuery.toLowerCase());
    setFilteredChatList(filtered);
  }, [searchQuery, chatList]);

  // Set timeout for loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log('Loading timeout - setting loading to false');
        setLoading(false);
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [loading]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleChatSelect = (chat) => {
    setSelectedChatId(chat.chatId);
    // Update URL without full navigation to keep split view
    navigate(`/chat/${chat.chatId}`, { replace: true });
  };

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
      <div className="chat-list-container">
        <div className="loading-container">
          <img src="/images/logo.png" alt="Loading" className="loading-logo" />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-list-container">
      {/* Top Header */}
      <div className="chat-main-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Ybe" className="header-logo" />
          <nav className="header-nav">
            <a href="/dashboard" className="nav-link">Matches</a>
            <a href="/chat" className="nav-link active">Messages</a>
          </nav>
        </div>
        <div className="header-right">
          <button className="upgrade-btn" onClick={() => navigate('/upgrade')}>Upgrade now</button>
          <button className="icon-btn" onClick={() => setShowLogoutModal(true)}>
            <img src="/images/profile.png" alt="Profile" className="header-icon" />
          </button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="chat-split-container">
        {/* Left Panel - Message List */}
        <div className="chat-list-panel">
          <div className="panel-header">
            <h2 className="panel-title">Messages</h2>
          </div>
          
          <div className="panel-search">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={handleSearchChange}
              className="panel-search-input"
              disabled={chatList.length === 0}
            />
            <img src="/images/search.png" alt="Search" className="panel-search-icon" />
          </div>

          <div className="chat-list-content">
            {chatList.length === 0 ? (
              <div className="no-chats-container">
                <div className="no-chats-icon">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="#FF2B45"/>
                  </svg>
                </div>
                <h2 className="no-chats-title">No messages yet.<br />Say hello to someone!</h2>
                <p className="no-chats-description">
                  Chats will appear here after you send or receive a message
                </p>
                <button 
                  className="start-conversation-btn"
                  onClick={() => navigate('/dashboard')}
                >
                  Start Conversation
                </button>
              </div>
            ) : (
              <div className="chat-list">
                {filteredChatList.length === 0 ? (
                  <div className="no-search-results">
                    <p>No chats found matching your search.</p>
                  </div>
                ) : (
                  filteredChatList.map((chat) => {
                    const partnerUserId = chat.chatUserData.participants?.find(
                      id => id !== userDetails?.userId
                    );
                    const partnerUserName = chat.chatUserData.userName?.[partnerUserId] || 'Unknown';
                    const unreadCount = chat.chatUserData.unreadCount?.[userDetails?.userId] || 0;
                    const isSelected = selectedChatId === chat.chatId;

                    return (
                      <div
                        key={chat.chatId}
                        className={`chat-tile-wrapper ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleChatSelect(chat)}
                      >
                        <ChatTile
                          chatId={chat.chatId}
                          userId={partnerUserId}
                          userName={partnerUserName}
                          lastMessage={chat.chatUserData.lastMessage || ''}
                          lastMessageType={chat.chatUserData.lastMessageType || 'Text'}
                          time={chat.chatUserData.lastMessageSentAt?.toDate() || new Date()}
                          unreadMessageCount={unreadCount}
                          partnerBlockedYou={chat.chatUserData.partnerBlockedYou || false}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Active Chat */}
        <div className="chat-detail-panel">
          {selectedChatId ? (
            <ChatDetail chatId={selectedChatId} />
          ) : (
            <div className="no-chat-selected">
              <div className="no-chat-icon">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="#ddd"/>
                </svg>
              </div>
              <p className="no-chat-text">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
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
    </div>
  );
}
