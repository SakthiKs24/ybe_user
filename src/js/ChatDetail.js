import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import ChatService from './services/chatService';
import MessagesList from './MessagesList';
import '../css/ChatDetail.css';

export default function ChatDetail({ chatId: propChatId }) {
  const navigate = useNavigate();
  const { chatId: paramChatId } = useParams();
  const chatId = propChatId || paramChatId;
  const [messageText, setMessageText] = useState('');
  const [partnerUserId, setPartnerUserId] = useState('');
  const [partnerUserName, setPartnerUserName] = useState('');
  const [partnerImage, setPartnerImage] = useState('');
  const [youBlockedPartner, setYouBlockedPartner] = useState(false);
  const [partnerBlockedYou, setPartnerBlockedYou] = useState(false);
  const [isPartnerDeleted, setIsPartnerDeleted] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [showBlockPopup, setShowBlockPopup] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const scrollRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/');
        return;
      }

      const userDetailsStr = localStorage.getItem('userDetails');
      if (userDetailsStr) {
        setUserDetails(JSON.parse(userDetailsStr));
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch chat data and check block status
  useEffect(() => {
    if (!chatId || !userDetails?.userId) return;

    const chatRef = doc(db, 'chats', chatId);
    const unsubscribe = onSnapshot(chatRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const chatData = data.chatUserData || {};
        
        const partnerId = chatData.participants?.find(
          id => id !== userDetails.userId
        );
        setPartnerUserId(partnerId || '');
        setPartnerUserName(chatData.userName?.[partnerId] || 'Unknown');
        setPartnerBlockedYou(chatData.blockedBy?.includes(partnerId) || false);
        
        // Check if current user has blocked the partner
        if (partnerId) {
          const userRef = doc(db, 'users', userDetails.userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const blockedUsers = userData.blockedUsers || [];
            setYouBlockedPartner(blockedUsers.includes(partnerId));
          }
        }
      }
    });

    return () => unsubscribe();
  }, [chatId, userDetails]);

  // Check if partner profile is deleted and fetch profile image
  useEffect(() => {
    if (!partnerUserId) return;

    const userRef = doc(db, 'users', partnerUserId);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsPartnerDeleted(false);
        const profileImages = data.profileImageUrls || [];
        setPartnerImage(profileImages[0] || '');
      } else {
        setIsPartnerDeleted(true);
        setPartnerImage('');
      }
    });

    return () => unsubscribe();
  }, [partnerUserId]);

  // Clear unread count when component mounts
  useEffect(() => {
    if (chatId && userDetails?.userId) {
      ChatService.clearUnreadCount(chatId, userDetails.userId);
    }
  }, [chatId, userDetails]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !chatId || !partnerUserId) return;
    if (youBlockedPartner || partnerBlockedYou || isPartnerDeleted) return;

    ChatService.sendMessage({
      chatId,
      partnerUserId,
      messageType: 'Text',
      messageContent: messageText.trim()
    });

    setMessageText('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMoreClick = (e) => {
    e.stopPropagation();
    setShowBlockPopup(!showBlockPopup);
  };

  const handleBlockClick = () => {
    setShowBlockPopup(false);
    if (youBlockedPartner) {
      // Unblock directly without confirmation
      toggleBlock();
    } else {
      // Show confirmation dialog for block
      setShowBlockConfirm(true);
    }
  };

  const toggleBlock = async () => {
    if (!userDetails?.userId || !partnerUserId) return;

    try {
      if (youBlockedPartner) {
        // Unblock
        await ChatService.removeFromBlockList(userDetails.userId, partnerUserId, chatId);
      } else {
        // Block
        await ChatService.addToBlockList(userDetails.userId, partnerUserId, chatId);
      }
      setShowBlockConfirm(false);
    } catch (error) {
      console.error('Error toggling block:', error);
    }
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && 
          !event.target.closest('.more-options-btn')) {
        setShowBlockPopup(false);
      }
    };

    if (showBlockPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBlockPopup]);

  const canSendMessage = !isPartnerDeleted && !youBlockedPartner && !partnerBlockedYou;

  return (
    <div className="chat-detail-container">
      <div className="chat-detail-header">
        <div className="header-user-info">
          <div className="header-avatar">
            {partnerBlockedYou || !partnerImage ? (
              <img 
                src="/images/default-profile.png" 
                alt={partnerUserName}
                className="avatar-img"
              />
            ) : (
              <img 
                src={partnerImage} 
                alt={partnerUserName}
                className="avatar-img"
              />
            )}
          </div>
          <div className="header-user-details">
            <h3 className="header-username">{partnerUserName}</h3>
            {!partnerBlockedYou && !isPartnerDeleted && (
              <span className="header-status">Online</span>
            )}
          </div>
        </div>

        <div className="more-options-container" ref={popupRef}>
          <button className="more-options-btn" onClick={handleMoreClick}>
            <img src="/images/more.png" alt="More" />
          </button>
          {showBlockPopup && (
            <div className="block-popup">
              <button 
                className="block-popup-item"
                onClick={handleBlockClick}
              >
                {youBlockedPartner ? 'Unblock' : 'Block'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="chat-detail-body">
        <MessagesList
          chatId={chatId}
          partnerUserName={partnerUserName}
          scrollRef={scrollRef}
        />
      </div>

      <div className="chat-detail-input">
        {isPartnerDeleted ? (
          <div className="input-disabled-message">
            Account deleted
          </div>
        ) : youBlockedPartner ? (
          <div className="input-disabled-message">
            Unblock the user to continue chat
          </div>
        ) : partnerBlockedYou ? (
          <div className="input-disabled-message">
            You can't message them
          </div>
        ) : (
          <div className="message-input-container">
            <button className="add-media-btn">
              <img src="/images/add.png" alt="Add" />
            </button>
            <input
              type="text"
              className="message-input"
              placeholder="Type your message"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button className="mic-btn">
              <img src="/images/microphone.png" alt="Microphone" />
            </button>
            <button className="emoji-btn">
              <img src="/images/emoji.png" alt="Emoji" />
            </button>
            <button 
              className="send-button"
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <img src="/images/send.png" alt="Send" />
            </button>
          </div>
        )}
      </div>

      {/* Block Confirmation Dialog */}
      {showBlockConfirm && (
        <div className="block-confirm-overlay" onClick={() => setShowBlockConfirm(false)}>
          <div className="block-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="block-confirm-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#FF2B45"/>
              </svg>
            </div>
            <div className="block-confirm-content">
              <p className="block-confirm-title">Do you want to block</p>
              <p className="block-confirm-name">{partnerUserName}?</p>
              <p className="block-confirm-description">
                You won't be able to send or receive messages from this user. You can unblock them anytime.
              </p>
            </div>
            <div className="block-confirm-actions">
              <button 
                className="block-confirm-cancel"
                onClick={() => setShowBlockConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="block-confirm-block"
                onClick={toggleBlock}
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

