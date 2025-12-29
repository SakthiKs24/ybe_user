import { db } from '../../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  getDocs,
  getDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

class ChatService {
  // Send a message
  async sendMessage({ chatId, partnerUserId, messageType, messageContent }) {
    try {
      const userDetailsStr = localStorage.getItem('userDetails');
      if (!userDetailsStr) {
        throw new Error('User details not found');
      }
      const userDetails = JSON.parse(userDetailsStr);
      const currentUserId = userDetails.userId || userDetails.uid;

      const messagesRef = collection(db, 'chats', chatId, 'messages');
      
      await addDoc(messagesRef, {
        senderId: currentUserId,
        text: messageContent,
        messageType: messageType,
        timestamp: serverTimestamp(),
        isRead: false,
        chatImageUrl: messageType === 'Image' ? messageContent : '',
        voiceMsgUrl: messageType === 'Voice' ? messageContent : '',
        videoMsgUrl: messageType === 'Video' ? messageContent : ''
      });

      // Update chat metadata
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const unreadCount = chatData.chatUserData?.unreadCount || {};
        unreadCount[partnerUserId] = (unreadCount[partnerUserId] || 0) + 1;

        await updateDoc(chatRef, {
          'chatUserData.lastMessage': messageType === 'Text' ? messageContent : this.getLastMessagePreview(messageType),
          'chatUserData.lastMessageType': messageType,
          'chatUserData.lastMessageSentAt': serverTimestamp(),
          'chatUserData.unreadCount': unreadCount
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error };
    }
  }

  getLastMessagePreview(messageType) {
    switch (messageType) {
      case 'Image': return 'Photo';
      case 'Voice': return 'Voice Message';
      case 'Video': return 'Video';
      default: return '';
    }
  }

  async getUnreadCount(chatId, userId) {
    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        return data.chatUserData?.unreadCount?.[userId] || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark message as read
  async markMessageAsRead(chatId, messageDoc) {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageDoc.id);
      await updateDoc(messageRef, {
        isRead: true
      });

      // Clear unread count for current user
      const userDetailsStr = localStorage.getItem('userDetails');
      if (userDetailsStr) {
        const userDetails = JSON.parse(userDetailsStr);
        const currentUserId = userDetails.userId || userDetails.uid;
        
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          const unreadCount = { ...(data.chatUserData?.unreadCount || {}) };
          unreadCount[currentUserId] = 0;
          
          await updateDoc(chatRef, {
            'chatUserData.unreadCount': unreadCount
          });
        }
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  // Clear unread count
  async clearUnreadCount(chatId, userId) {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        const unreadCount = { ...(data.chatUserData?.unreadCount || {}) };
        unreadCount[userId] = 0;
        
        await updateDoc(chatRef, {
          'chatUserData.unreadCount': unreadCount
        });
      }
    } catch (error) {
      console.error('Error clearing unread count:', error);
    }
  }

  // Filter chats by user name
  filterChatsByUserName(chatList, searchQuery) {
    if (!searchQuery) return chatList;
    
    const userDetailsStr = localStorage.getItem('userDetails');
    if (!userDetailsStr) return chatList;
    
    const userDetails = JSON.parse(userDetailsStr);
    const currentUserId = userDetails.userId || userDetails.uid;
    
    return chatList.filter(chat => {
      const partnerUserId = chat.chatUserData.participants?.find(
        id => id !== currentUserId
      );
      const partnerUserName = chat.chatUserData.userName?.[partnerUserId] || '';
      return partnerUserName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }

  // Add user to block list
  async addToBlockList(userId, partnerUserId, chatId = null) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(partnerUserId)
      });
      
      // Also update chat's blockedBy array if chatId is provided
      if (chatId) {
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
          const blockedBy = chatDoc.data().chatUserData?.blockedBy || [];
          if (!blockedBy.includes(userId)) {
            await updateDoc(chatRef, {
              'chatUserData.blockedBy': arrayUnion(userId)
            });
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error adding to block list:', error);
      return { success: false, error };
    }
  }

  // Remove user from block list
  async removeFromBlockList(userId, partnerUserId, chatId = null) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(partnerUserId)
      });
      
      // Also update chat's blockedBy array if chatId is provided
      if (chatId) {
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
          const blockedBy = chatDoc.data().chatUserData?.blockedBy || [];
          if (blockedBy.includes(userId)) {
            await updateDoc(chatRef, {
              'chatUserData.blockedBy': arrayRemove(userId)
            });
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error removing from block list:', error);
      return { success: false, error };
    }
  }
}

export default new ChatService();

