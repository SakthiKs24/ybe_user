import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './js/Homepage';
import CreateAccount from './js/CreateAccount';
import Dashboard from './js/Dashboard';
import ProfileSetup from './js/ProfileSetup';
import Upgrade from './js/Upgrade';
import ChatList from './js/ChatList';
import ChatDetail from './js/ChatDetail';
import MyMatches from './js/MyMatches';
import ProfileDetails from './js/ProfileDetails';
import FavoriteCategory from './js/FavoriteCategory';
import Profile from './js/Profile';
import Favorites from './js/Favorites';
import PaymentSuccess from './js/PaymentSuccess';
import PaymentCancel from './js/PaymentCancel';
import PrivacyPolicy from './js/PrivacyPolicy';
import ConsentForm from './js/ConsentForm';
import { ProtectedRoute, PublicRoute } from './js/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        {/* Homepage - accessible to everyone (both logged in and logged out) */}
        <Route path="/" element={<Homepage />} />
        
        {/* Public Routes - Only accessible when NOT logged in */}
        <Route 
          path="/create-account" 
          element={
            <PublicRoute>
              <CreateAccount />
            </PublicRoute>
          } 
        />
        <Route path="/consent" element={<ConsentForm />} />
        
        {/* Protected Routes - Only accessible when logged in */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile-setup" 
          element={
            <ProtectedRoute>
              <ProfileSetup />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/upgrade" 
          element={
            <ProtectedRoute>
              <Upgrade />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat/:chatId?" 
          element={
            <ProtectedRoute>
              <ChatList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile/:userId" 
          element={
            <ProtectedRoute>
              <ProfileDetails />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/favorites" 
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/favorites/:category" 
          element={
            <ProtectedRoute>
              <FavoriteCategory />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-matches" 
          element={
            <ProtectedRoute>
              <MyMatches />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payment-success" 
          element={
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payment-cancel" 
          element={
            <ProtectedRoute>
              <PaymentCancel />
            </ProtectedRoute>
          } 
        />
        
        {/* Public route - accessible to everyone */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      </Routes>
    </Router>
  );
}

export default App;