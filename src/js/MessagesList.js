import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import ChatService from './services/chatService';
import '../css/MessagesList.css';

export default function MessagesList({ chatId, partnerUserName, scrollRef }) {
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    const userDetailsStr = localStorage.getItem('userDetails');
    if (userDetailsStr) {
      setUserDetails(JSON.parse(userDetailsStr));
    }
  }, []);

  useEffect(() => {
    if (!chatId || !userDetails?.userId) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setMessages(messagesList);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [chatId, userDetails]);

  // Mark messages as read
  useEffect(() => {
    if (!chatId || !userDetails?.userId || messages.length === 0) return;

    messages.forEach(message => {
      if (message.senderId !== userDetails.userId && !message.isRead) {
        ChatService.markMessageAsRead(chatId, { id: message.id });
      }
    });
  }, [messages, chatId, userDetails]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const renderMessage = (message) => {
    const isSender = message.senderId === userDetails?.userId;

    switch (message.messageType) {
      case 'Text':
        return (
          <div className={`message-bubble ${isSender ? 'sent' : 'received'}`}>
            <p className="message-text">{message.text}</p>
            <div className="message-time">
              {formatTime(message.timestamp)}
              {isSender && message.isRead && (
                <span className="read-indicator">✓✓</span>
              )}
            </div>
          </div>
        );

      case 'Image':
        return (
          <div className={`message-bubble ${isSender ? 'sent' : 'received'}`}>
            <img 
              src={message.chatImageUrl} 
              alt="Shared image"
              className="message-image"
            />
            <div className="message-time">
              {formatTime(message.timestamp)}
            </div>
          </div>
        );

      case 'Voice':
        return (
          <div className={`message-bubble ${isSender ? 'sent' : 'received'}`}>
            <div className="voice-message">
              <span className="voice-icon">🎤</span>
              <span>Voice Message</span>
            </div>
            <div className="message-time">
              {formatTime(message.timestamp)}
            </div>
          </div>
        );

      case 'Video':
        return (
          <div className={`message-bubble ${isSender ? 'sent' : 'received'}`}>
            <div className="video-message">
              <span className="video-icon">🎥</span>
              <span>Video</span>
            </div>
            <div className="message-time">
              {formatTime(message.timestamp)}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (messages.length === 0) {
    return (
      <div className="no-messages">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="messages-list" ref={scrollRef}>
      {messages.map((message) => (
        <div 
          key={message.id} 
          className={`message-wrapper ${message.senderId === userDetails?.userId ? 'sent-wrapper' : 'received-wrapper'}`}
        >
          {renderMessage(message)}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

