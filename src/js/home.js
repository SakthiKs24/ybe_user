import React, { useState } from 'react';

function Home() {
  const [formData, setFormData] = useState({
    gender: 'Woman',
    ageFrom: '25',
    ageTo: '30',
    religion: 'Select',
    motherTongue: 'Select'
  });

  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({
    profileFor: 'Myself',
    interestedIn: 'Both'
  });

  const handleSubmit = () => {
    setShowPopup(true);
  };

  const handlePopupContinue = () => {
    console.log('Form submitted:', { ...formData, ...popupData });
    setShowPopup(false);
    alert('Finding your match...');
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fdf2f8 0%, #ffffff 50%, #faf5ff 100%)',
    },
    header: {
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      position: 'fixed',
      width: '100%',
      top: 0,
      zIndex: 50,
    },
    headerContent: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '1rem 1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    logo: {
      height: '40px',
      width: 'auto',
    },
    nav: {
      display: 'flex',
      gap: '2rem',
      alignItems: 'center',
    },
    navButton: {
      color: '#374151',
      fontWeight: 500,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      transition: 'color 0.3s',
      fontSize: '16px',
    },
    main: {
      paddingTop: '8rem',
      paddingBottom: '5rem',
      padding: '4rem ',
      backgroundImage: 'url(/images/background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    },
    mainContent: {
      maxWidth: '1280px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '3rem',
      alignItems: 'flex-start',
    },
    leftSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
    },
    heading: {
      fontSize: '3.5rem',
      fontWeight: 'bold',
      color: '#111827',
      lineHeight: '1.2',
      marginBottom: '1rem',
    },
    headingGradient: {
      fontSize: '3.5rem',
      fontWeight: 'bold',
      background: 'linear-gradient(90deg, #ef4444, #ec4899)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      lineHeight: '1.2',
    },
    formContainer: {
      background: 'rgba(243, 232, 255, 0.5)',
      borderRadius: '1rem',
      padding: '2rem',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    },
    formRow: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '1rem',
      alignItems: 'flex-end',
      marginBottom: '1.5rem',
    },
    formField: {
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: 500,
      color: '#374151',
      marginBottom: '0.5rem',
    },
    select: {
      padding: '0.625rem 1rem',
      borderRadius: '0.5rem',
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      color: '#374151',
      fontSize: '1rem',
      outline: 'none',
      cursor: 'pointer',
      minWidth: '120px',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23ef4444\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0.75rem center',
      paddingRight: '2.5rem',
    },
    toText: {
      color: '#6b7280',
      paddingBottom: '0.625rem',
      fontSize: '1rem',
    },
    buttonContainer: {
      display: 'flex',
      justifyContent: 'center',
      paddingTop: '0.5rem',
    },
    button: {
      padding: '0.75rem 2.5rem',
      background: 'linear-gradient(90deg, #ef4444, #ec4899)',
      color: '#ffffff',
      fontWeight: 600,
      borderRadius: '9999px',
      border: 'none',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      cursor: 'pointer',
      fontSize: '1rem',
      transition: 'all 0.2s',
    },
    imageContainer: {
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '700px',
      paddingLeft: '75px',
      objectFit: 'cover',
    },
    popupOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    popupContainer: {
      background: 'white',
      borderRadius: '1.5rem',
      padding: '2.5rem',
      maxWidth: '500px',
      width: '90%',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
    },
    popupIcon: {
      width: '60px',
      height: '60px',
      margin: '0 auto 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    popupTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#111827',
      textAlign: 'center',
      marginBottom: '2rem',
    },
    popupSection: {
      marginBottom: '2rem',
    },
    popupSectionTitle: {
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '1rem',
    },
    optionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '0.75rem',
      marginBottom: '1rem',
    },
    optionButton: {
      padding: '0.75rem 1rem',
      borderRadius: '0.5rem',
      border: '2px solid #e5e7eb',
      background: 'white',
      cursor: 'pointer',
      fontSize: '0.95rem',
      fontWeight: '500',
      color: '#374151',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
    },
    optionButtonSelected: {
      borderColor: '#ef4444',
      background: '#fef2f2',
      color: '#ef4444',
    },
    checkIcon: {
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      border: '2px solid #d1d5db',
      display: 'inline-block',
      position: 'relative',
    },
    checkIconSelected: {
      backgroundColor: '#ef4444',
      borderColor: '#ef4444',
    },
    continueButton: {
      // width: '100%',
      padding: '0.875rem',
      background: 'linear-gradient(90deg, #ef4444, #ec4899)',
      color: 'white',
      fontWeight: '600',
      borderRadius: '9999px',
      border: 'none',
      fontSize: '1rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginTop: '1rem',
      marginLeft: '190px',
      paddingLeft: '25px',
      paddingRight: '25px'
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <img src="/images/logo.png" alt="Logo" style={styles.logo} />
          </div>
          <nav style={styles.nav}>
            <button 
              style={styles.navButton}
              onMouseEnter={(e) => e.target.style.color = '#ef4444'}
              onMouseLeave={(e) => e.target.style.color = '#374151'}
              onClick={() => window.location.href = '/privacy-policy'}
            >
              Privacy Policy
            </button>
            <button 
              style={styles.navButton}
              onMouseEnter={(e) => e.target.style.color = '#ef4444'}
              onMouseLeave={(e) => e.target.style.color = '#374151'}
            >
              Login 
            </button>
            <button 
              style={styles.navButton}
              onMouseEnter={(e) => e.target.style.color = '#ef4444'}
              onMouseLeave={(e) => e.target.style.color = '#374151'}
            >
              Help
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.mainContent}>
          {/* Left Content */}
          <div style={styles.leftSection}>
            <div>
              <h1 style={styles.heading}>
                Where majority of NRis
              </h1>
              <h2 style={styles.headingGradient}>
                date and marry
              </h2>
            </div>

            {/* Search Form */}
            <div style={styles.formContainer}>
              <div style={styles.formRow}>
                {/* Gender Selection */}
                <div style={styles.formField}>
                  <label style={styles.label}>
                    I'm looking for a
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    style={styles.select}
                    onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option>Woman</option>
                    <option>Man</option>
                  </select>
                </div>

                {/* Age From */}
                <div style={styles.formField}>
                  <label style={styles.label}>
                    aged
                  </label>
                  <select
                    value={formData.ageFrom}
                    onChange={(e) => setFormData({...formData, ageFrom: e.target.value})}
                    style={styles.select}
                    onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    {[...Array(43)].map((_, i) => (
                      <option key={i} value={18 + i}>{18 + i}</option>
                    ))}
                  </select>
                </div>

                <span style={styles.toText}>to</span>

                {/* Age To */}
                <div style={styles.formField}>
                  <select
                    value={formData.ageTo}
                    onChange={(e) => setFormData({...formData, ageTo: e.target.value})}
                    style={styles.select}
                    onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    {[...Array(43)].map((_, i) => (
                      <option key={i} value={18 + i}>{18 + i}</option>
                    ))}
                  </select>
                </div>

                {/* Religion */}
                <div style={styles.formField}>
                  <label style={styles.label}>
                    of religion
                  </label>
                  <select
                    value={formData.religion}
                    onChange={(e) => setFormData({...formData, religion: e.target.value})}
                    style={styles.select}
                    onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option>Select</option>
                    <option>Hindu</option>
                    <option>Muslim</option>
                    <option>Christian</option>
                    <option>Sikh</option>
                    <option>Buddhist</option>
                    <option>Jain</option>
                    <option>Others</option>
                  </select>
                </div>

                {/* Mother Tongue */}
                <div style={styles.formField}>
                  <label style={styles.label}>
                    Mother Tongue
                  </label>
                  <select
                    value={formData.motherTongue}
                    onChange={(e) => setFormData({...formData, motherTongue: e.target.value})}
                    style={styles.select}
                    onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option>Select</option>
                    <option>Tamil</option>
                    <option>Hindi</option>
                    <option>Telugu</option>
                    <option>Malayalam</option>
                    <option>Kannada</option>
                    <option>Bengali</option>
                    <option>Marathi</option>
                    <option>Gujarati</option>
                    <option>Punjabi</option>
                    <option>English</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div style={styles.buttonContainer}>
                <button
                  onClick={handleSubmit}
                  style={styles.button}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  Find Your Match
                </button>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div style={styles.imageContainer}>
            <img
              src="/images/home.png"
              alt="Happy couple"
              style={styles.image}
            />
          </div>
        </div>
      </main>

      {/* Popup Modal */}
      {showPopup && (
        <div style={styles.popupOverlay} onClick={() => setShowPopup(false)}>
          <div style={styles.popupContainer} onClick={(e) => e.stopPropagation()}>
            {/* Heart Icon */}
            <div style={styles.popupIcon}>
  <img src="/images/logo1.png" alt="Logo" style={styles.logo} />
</div>


            <h3 style={styles.popupSectionTitle}>This Profile is for</h3>

            {/* Profile For Section */}
            <div style={styles.popupSection}>
              <div style={styles.optionGrid}>
                {['Myself', 'My Son', 'My daughter', 'My friend', 'My sister'].map((option) => (
                  <button
                    key={option}
                    style={{
                      ...styles.optionButton,
                      ...(popupData.profileFor === option ? styles.optionButtonSelected : {})
                    }}
                    onClick={() => setPopupData({...popupData, profileFor: option})}
                  >
                    <span style={{
                      ...styles.checkIcon,
                      ...(popupData.profileFor === option ? styles.checkIconSelected : {})
                    }}>
                      {popupData.profileFor === option && (
                        <svg width="12" height="12" viewBox="0 0 12 12" style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>
                          <path d="M2 6l2.5 2.5L10 3" stroke="white" strokeWidth="2" fill="none"/>
                        </svg>
                      )}
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Interested In Section */}
            <div style={styles.popupSection}>
              <h3 style={styles.popupSectionTitle}>Interested in</h3>
              <div style={styles.optionGrid}>
                {['Dating', 'Marrying', 'Both'].map((option) => (
                  <button
                    key={option}
                    style={{
                      ...styles.optionButton,
                      ...(popupData.interestedIn === option ? styles.optionButtonSelected : {})
                    }}
                    onClick={() => setPopupData({...popupData, interestedIn: option})}
                  >
                    <span style={{
                      ...styles.checkIcon,
                      ...(popupData.interestedIn === option ? styles.checkIconSelected : {})
                    }}>
                      {popupData.interestedIn === option && (
                        <svg width="12" height="12" viewBox="0 0 12 12" style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>
                          <path d="M2 6l2.5 2.5L10 3" stroke="white" strokeWidth="2" fill="none"/>
                        </svg>
                      )}
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <button
              style={styles.continueButton}
              onClick={handlePopupContinue}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;