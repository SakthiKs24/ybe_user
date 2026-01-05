import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './js/Homepage';
import CreateAccount from './js/CreateAccount';
import Dashboard from './js/Dashboard';
import ProfileSetup from './js/ProfileSetup';
import Upgrade from './js/Upgrade';
import ChatList from './js/ChatList';
import ChatDetail from './js/ChatDetail';
import ProfileDetails from './js/ProfileDetails';
import FavoriteCategory from './js/FavoriteCategory';
import Profile from './js/Profile';
import Favorites from './js/Favorites';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    
    <Router>
              <ToastContainer />

      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/upgrade" element={<Upgrade />} />
        <Route path="/chat/:chatId?" element={<ChatList />} />
        <Route path="/profile/:userId" element={<ProfileDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/favorites/:category" element={<FavoriteCategory />} />

      </Routes>
    </Router>
  );
}

export default App;
