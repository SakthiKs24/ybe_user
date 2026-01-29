import React from 'react';
import { useNavigate } from 'react-router-dom';

const SubHeader = ({ activeTab, setActiveTab, searchQuery = '', setSearchQuery = null, placeholder = 'Search by name' }) => {
  const navigate = useNavigate();
  
  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'new-matches' && activeTab !== 'new-matches') {
      navigate('/dashboard');
    } else if (tabName === 'my-matches' && activeTab !== 'my-matches') {
      navigate('/my-matches');
    } else if (tabName === 'favourites' && activeTab !== 'favourites') {
      navigate('/favorites');
    }
  };
  
  return (
    <div className="favorites-tabs" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
        <button 
          className={`tab-btn ${activeTab === 'new-matches' ? 'active' : ''}`}
          onClick={() => handleTabClick('new-matches')}
        >
          New Matches
        </button>
        
        <button 
          className={`tab-btn ${activeTab === 'my-matches' ? 'active' : ''}`}
          onClick={() => handleTabClick('my-matches')}
        >
          My Matches
        </button>
        
        <button 
          className={`tab-btn ${activeTab === 'favourites' ? 'active' : ''}`}
          onClick={() => handleTabClick('favourites')}
        >
          Favourites
        </button>
      </div>
      {typeof setSearchQuery === 'function' && (
        <div style={{ marginLeft: 'auto' }}>
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="subheader-search-input"
            style={{
              padding: '8px 12px',
              borderRadius: '20px',
              border: '1px solid #ddd',
              minWidth: '220px',
              outline: 'none'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SubHeader;