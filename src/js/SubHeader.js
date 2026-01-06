import React from 'react';
import { useNavigate } from 'react-router-dom';

const SubHeader = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  
  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'new-matches' && activeTab !== 'new-matches') {
      navigate('/dashboard');
    } else if (tabName === 'favourites' && activeTab !== 'favourites') {
      navigate('/favorites');
    }
  };
  
  return (
    <div className="favorites-tabs">
      <button 
        className={`tab-btn ${activeTab === 'new-matches' ? 'active' : ''}`}
        onClick={() => handleTabClick('new-matches')}
      >
        New Matches
      </button>
      
      <button 
        className={`tab-btn ${activeTab === 'favourites' ? 'active' : ''}`}
        onClick={() => handleTabClick('favourites')}
      >
        Favourites
      </button>
    </div>
  );
};

export default SubHeader;