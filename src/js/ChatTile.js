import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import ChatDetail from './ChatDetail';
import '../css/ChatTile.css';

export default function ChatTile({
  chatId,
  userId,
  userName,
  lastMessage,
  lastMessageType,
  time,
  unreadMessageCount,
  partnerBlockedYou
}) {
  const navigate = useNavigate();
  const [partnerImage, setPartnerImage] = useState('');
  const [partnerStatus, setPartnerStatus] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    const userDetailsStr = localStorage.getItem('userDetails');
    if (userDetailsStr) {
      setUserDetails(JSON.parse(userDetailsStr));
    }
  }, []);

  // Fetch partner profile image
  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const profileImages = data.profileImageUrls || [];
        setPartnerImage(profileImages[0] || '');
        setPartnerStatus(data.onlineStatus || false);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const formatTimeDifference = (dateTime) => {
    if (!dateTime) return 'Now';
    
    const now = new Date();
    const diff = now - dateTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  const buildLastMessage = (messageType, message) => {
    switch (messageType) {
      case 'Text':
        return <span className="last-message-text">{message}</span>;
      case 'Image':
        return (
          <span className="last-message-media">
            <span className="media-icon">📷</span> Photo
          </span>
        );
      case 'Voice':
        return (
          <span className="last-message-media">
            <span className="media-icon">🎤</span> Voice Message
          </span>
        );
      case 'Video':
        return (
          <span className="last-message-media">
            <span className="media-icon">🎥</span> Video
          </span>
        );
      default:
        return <span className="last-message-text">{message}</span>;
    }
  };

  const handleChatClick = () => {
    if (userDetails?.subscriptions?.isFreePlan) {
      // Show upgrade dialog - you can implement this
      alert('Please upgrade to access chat');
      return;
    }
    navigate(`/chat/${chatId}`, {
      state: {
        partnerUserId: userId,
        partnerUserName: userName,
        partnerBlockedYou: partnerBlockedYou
      }
    });
  };

  return (
    <div className="chat-tile" onClick={handleChatClick}>
      <div className="chat-tile-avatar">
        <div className="avatar-container">
          {partnerBlockedYou || !partnerImage ? (
            <img 
              src="/images/default-profile.png" 
              alt={userName}
              className="avatar-image"
            />
          ) : (
            <img 
              src={partnerImage} 
              alt={userName}
              className="avatar-image"
            />
          )}
          {!partnerBlockedYou && (
            <div 
              className={`status-indicator ${partnerStatus ? 'online' : 'offline'}`}
            />
          )}
        </div>
      </div>

      <div className="chat-tile-content">
        <div className="chat-tile-header">
          <h3 className="chat-tile-name">{userName}</h3>
          <span className="chat-tile-time">{formatTimeDifference(time)}</span>
        </div>
        <div className="chat-tile-message">
          {buildLastMessage(lastMessageType, lastMessage)}
          {unreadMessageCount > 0 && (
            <div className="unread-badge">
              {unreadMessageCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

