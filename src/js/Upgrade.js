import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../css/Upgrade.css';

export default function Upgrade() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState({ code: 'GBP', symbol: '£' });
  const [userCountry, setUserCountry] = useState('GB');

  // Currency mapping
  const currencyMap = {
    'AF': 'AFN', 'AL': 'ALL', 'DZ': 'DZD', 'AO': 'AOA', 'AR': 'ARS', 'AM': 'AMD',
    'AW': 'AWG', 'AU': 'AUD', 'AZ': 'AZN', 'BS': 'BSD', 'BH': 'BHD', 'BD': 'BDT',
    'BB': 'BBD', 'BY': 'BYN', 'BE': 'EUR', 'BZ': 'BZD', 'BJ': 'XOF', 'BM': 'BMD',
    'BT': 'BTN', 'BO': 'BOB', 'BA': 'BAM', 'BW': 'BWP', 'BR': 'BRL', 'BN': 'BND',
    'BG': 'BGN', 'BF': 'XOF', 'BI': 'BIF', 'KH': 'KHR', 'CM': 'XAF', 'CA': 'CAD',
    'CV': 'CVE', 'CF': 'XAF', 'TD': 'XAF', 'CL': 'CLP', 'CN': 'CNY', 'CO': 'COP',
    'KM': 'KMF', 'CD': 'CDF', 'CG': 'XAF', 'CR': 'CRC', 'CI': 'XOF', 'HR': 'HRK',
    'CU': 'CUP', 'CY': 'EUR', 'CZ': 'CZK', 'DK': 'DKK', 'DJ': 'DJF', 'DM': 'XCD',
    'DO': 'DOP', 'EC': 'USD', 'EG': 'EGP', 'SV': 'USD', 'GQ': 'XAF', 'ER': 'ERN',
    'EE': 'EUR', 'ET': 'ETB', 'FJ': 'FJD', 'FI': 'EUR', 'FR': 'EUR', 'GA': 'XAF',
    'GM': 'GMD', 'GE': 'GEL', 'DE': 'EUR', 'GH': 'GHS', 'GR': 'EUR', 'GD': 'XCD',
    'GT': 'GTQ', 'GN': 'GNF', 'GW': 'XOF', 'GY': 'GYD', 'HT': 'HTG', 'HN': 'HNL',
    'HU': 'HUF', 'IS': 'ISK', 'IN': 'INR', 'ID': 'IDR', 'IR': 'IRR', 'IQ': 'IQD',
    'IE': 'EUR', 'IL': 'ILS', 'IT': 'EUR', 'JM': 'JMD', 'JP': 'JPY', 'JO': 'JOD',
    'KZ': 'KZT', 'KE': 'KES', 'KI': 'AUD', 'KP': 'KPW', 'KR': 'KRW', 'KW': 'KWD',
    'KG': 'KGS', 'LA': 'LAK', 'LV': 'EUR', 'LB': 'LBP', 'LS': 'LSL', 'LR': 'LRD',
    'LY': 'LYD', 'LT': 'EUR', 'LU': 'EUR', 'MG': 'MGA', 'MW': 'MWK', 'MY': 'MYR',
    'MV': 'MVR', 'ML': 'XOF', 'MT': 'EUR', 'MH': 'USD', 'MR': 'MRU', 'MU': 'MUR',
    'MX': 'MXN', 'FM': 'USD', 'MD': 'MDL', 'MC': 'EUR', 'MN': 'MNT', 'ME': 'EUR',
    'MA': 'MAD', 'MZ': 'MZN', 'MM': 'MMK', 'NA': 'NAD', 'NR': 'AUD', 'NP': 'NPR',
    'NL': 'EUR', 'NZ': 'NZD', 'NI': 'NIO', 'NE': 'XOF', 'NG': 'NGN', 'NO': 'NOK',
    'OM': 'OMR', 'PK': 'PKR', 'PW': 'USD', 'PA': 'PAB', 'PG': 'PGK', 'PY': 'PYG',
    'PE': 'PEN', 'PH': 'PHP', 'PL': 'PLN', 'PT': 'EUR', 'QA': 'QAR', 'RO': 'RON',
    'RU': 'RUB', 'RW': 'RWF', 'KN': 'XCD', 'LC': 'XCD', 'VC': 'XCD', 'WS': 'WST',
    'SM': 'EUR', 'ST': 'STN', 'SA': 'SAR', 'SN': 'XOF', 'RS': 'RSD', 'SC': 'SCR',
    'SL': 'SLL', 'SG': 'SGD', 'SK': 'EUR', 'SI': 'EUR', 'SB': 'SBD', 'SO': 'SOS',
    'ZA': 'ZAR', 'SS': 'SSP', 'ES': 'EUR', 'LK': 'LKR', 'SD': 'SDG', 'SR': 'SRD',
    'SZ': 'SZL', 'SE': 'SEK', 'CH': 'CHF', 'SY': 'SYP', 'TW': 'TWD', 'TJ': 'TJS',
    'TZ': 'TZS', 'TH': 'THB', 'TL': 'USD', 'TG': 'XOF', 'TO': 'TOP', 'TT': 'TTD',
    'TN': 'TND', 'TR': 'TRY', 'TM': 'TMT', 'TV': 'AUD', 'UG': 'UGX', 'UA': 'UAH',
    'AE': 'AED', 'GB': 'GBP', 'US': 'USD', 'UY': 'UYU', 'UZ': 'UZS', 'VU': 'VUV',
    'VE': 'VES', 'VN': 'VND', 'YE': 'YER', 'ZM': 'ZMW', 'ZW': 'ZWL'
  };

  const currencySymbolMap = {
    'AF': '؋', 'AL': 'Lek', 'DZ': 'د.ج', 'AO': 'Kz', 'AR': '$', 'AM': '֏',
    'AW': 'ƒ', 'AU': '$', 'AZ': '₼', 'BS': '$', 'BH': '.د.ب', 'BD': '৳',
    'BB': '$', 'BY': 'Br', 'BE': '€', 'BZ': 'BZ$', 'BJ': 'CFA', 'BM': '$',
    'BT': 'Nu.', 'BO': 'Bs.', 'BA': 'KM', 'BW': 'P', 'BR': 'R$', 'BN': '$',
    'BG': 'лв', 'BF': 'CFA', 'BI': 'FBu', 'KH': '៛', 'CM': 'FCFA', 'CA': '$',
    'CV': '$', 'CF': 'FCFA', 'TD': 'FCFA', 'CL': '$', 'CN': '¥', 'CO': '$',
    'KM': 'CF', 'CD': 'FC', 'CG': 'FCFA', 'CR': '₡', 'CI': 'CFA', 'HR': 'kn',
    'CU': '$', 'CY': '€', 'CZ': 'Kč', 'DK': 'kr', 'DJ': 'Fdj', 'DM': '$',
    'DO': '$', 'EC': '$', 'EG': '£', 'SV': '$', 'GQ': 'FCFA', 'ER': 'Nfk',
    'EE': '€', 'ET': 'Br', 'FJ': '$', 'FI': '€', 'FR': '€', 'GA': 'FCFA',
    'GM': 'D', 'GE': '₾', 'DE': '€', 'GH': '₵', 'GR': '€', 'GD': '$',
    'GT': 'Q', 'GN': 'FG', 'GW': 'CFA', 'GY': '$', 'HT': 'G', 'HN': 'L',
    'HU': 'Ft', 'IS': 'kr', 'IN': '₹', 'ID': 'Rp', 'IR': '﷼', 'IQ': 'ع.د',
    'IE': '€', 'IL': '₪', 'IT': '€', 'JM': 'J$', 'JP': '¥', 'JO': 'د.ا',
    'KZ': '₸', 'KE': 'KSh', 'KI': '$', 'KP': '₩', 'KR': '₩', 'KW': 'د.ك',
    'KG': 'лв', 'LA': '₭', 'LV': '€', 'LB': 'ل.ل', 'LS': 'L', 'LR': '$',
    'LY': 'ل.د', 'LT': '€', 'LU': '€', 'MG': 'Ar', 'MW': 'MK', 'MY': 'RM',
    'MV': 'Rf', 'ML': 'CFA', 'MT': '€', 'MH': '$', 'MR': 'UM', 'MU': '₨',
    'MX': '$', 'FM': '$', 'MD': 'L', 'MC': '€', 'MN': '₮', 'ME': '€',
    'MA': 'د.م.', 'MZ': 'MT', 'MM': 'K', 'NA': '$', 'NR': '$', 'NP': '₨',
    'NL': '€', 'NZ': '$', 'NI': 'C$', 'NE': 'CFA', 'NG': '₦', 'NO': 'kr',
    'OM': 'ر.ع.', 'PK': '₨', 'PW': '$', 'PA': 'B/.', 'PG': 'K', 'PY': '₲',
    'PE': 'S/', 'PH': '₱', 'PL': 'zł', 'PT': '€', 'QA': 'ر.ق', 'RO': 'lei',
    'RU': '₽', 'RW': 'FRw', 'KN': '$', 'LC': '$', 'VC': '$', 'WS': 'T',
    'SM': '€', 'ST': 'Db', 'SA': '﷼', 'SN': 'CFA', 'RS': 'дин.', 'SC': '₨',
    'SL': 'Le', 'SG': '$', 'SK': '€', 'SI': '€', 'SB': '$', 'SO': 'S',
    'ZA': 'R', 'SS': '£', 'ES': '€', 'LK': 'Rs', 'SD': 'ج.س.', 'SR': '$',
    'SZ': 'E', 'SE': 'kr', 'CH': 'CHF', 'SY': '£', 'TW': 'NT$', 'TJ': 'ЅМ',
    'TZ': 'TSh', 'TH': '฿', 'TL': '$', 'TG': 'CFA', 'TO': 'T$', 'TT': 'TT$',
    'TN': 'د.ت', 'TR': '₺', 'TM': 'm', 'TV': '$', 'UG': 'USh', 'UA': '₴',
    'AE': 'د.إ', 'GB': '£', 'US': '$', 'UY': '$U', 'UZ': "so'm", 'VU': 'VT',
    'VE': 'Bs.', 'VN': '₫', 'YE': '﷼', 'ZM': 'ZK', 'ZW': '$'
  };

  // Detect user country
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const countryCode = data.country_code || 'GB';
        setUserCountry(countryCode);
        
        const currencyCode = currencyMap[countryCode] || 'GBP';
        const currencySymbol = currencySymbolMap[countryCode] || '£';
        setCurrency({ code: currencyCode, symbol: currencySymbol });
      } catch (error) {
        console.error('Error detecting country:', error);
        setCurrency({ code: 'GBP', symbol: '£' });
      }
    };

    detectCountry();
  }, []);

  // Fetch subscription plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const docRef = doc(db, 'subscription', 'plans');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const planArray = [];

          // Sort plans by key (plan_1, plan_2, plan_3)
          Object.keys(data)
            .sort((a, b) => {
              const numA = parseInt(a.split('_')[1] || 0);
              const numB = parseInt(b.split('_')[1] || 0);
              return numA - numB;
            })
            .forEach((key) => {
              const planData = data[key];
              planArray.push({
                name: planData.name || '',
                cost: planData.cost || 0,
                validityDays: planData.validityDays || 0,
                ...planData
              });
            });

          setPlans(planArray);
        } else {
          // Default plans if Firestore doesn't have data
          setPlans([
            { name: 'Ybe Plus', cost: 20, validityDays: 30, type: 'plus' },
            { name: 'Ybe Premium', cost: 50, validityDays: 90, type: 'premium' },
            { name: 'Ybe Gold', cost: 90, validityDays: 180, type: 'gold' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        // Default plans on error
        setPlans([
          { name: 'Ybe Plus', cost: 20, validityDays: 30, type: 'plus' },
          { name: 'Ybe Premium', cost: 50, validityDays: 90, type: 'premium' },
          { name: 'Ybe Gold', cost: 90, validityDays: 180, type: 'gold' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const getPlanType = (planName) => {
    const name = planName.toLowerCase();
    if (name.includes('plus')) return 'plus';
    if (name.includes('gold')) return 'gold';
    if (name.includes('platinum') || name.includes('premium')) return 'platinum';
    return 'plus';
  };

  const planFeatures = {
    plus: {
      upgradeLikes: [
        { text: 'Unlimited likes', enabled: true },
        { text: 'See who likes you', enabled: false },
        { text: 'Priority Likes', enabled: false, subtitle: 'Your likes will be seen sooner with priority likes.' }
      ],
      enhanceExperience: [
        { text: 'Unlimited Rewinds', enabled: true },
        { text: '1 free Boost per month', enabled: true },
        { text: '3 free super likes per week', enabled: true },
        { text: '3 free first impressions/week', enabled: false, subtitle: 'Stand out with a message before matching.' }
      ],
      premiumDiscovery: [
        { text: 'Unlimited Rewinds', enabled: true },
        { text: '1 free Boost per month', enabled: true },
        { text: '3 free super likes per week', enabled: true },
        { text: '3 free first impressions/week', enabled: false, subtitle: 'Stand out with a message before matching.' }
      ]
    },
    gold: {
      upgradeLikes: [
        { text: 'Unlimited likes', enabled: true },
        { text: 'See who likes you', enabled: true },
        { text: 'Priority Likes', enabled: false, subtitle: 'Your likes will be seen sooner with priority likes.' }
      ],
      enhanceExperience: [
        { text: 'Unlimited Rewinds', enabled: true },
        { text: '1 free Boost per month', enabled: true },
        { text: '3 free super likes per week', enabled: true },
        { text: '3 free first impressions/week', enabled: false, subtitle: 'Stand out with a message before matching.' }
      ],
      premiumDiscovery: [
        { text: 'Unlimited Rewinds', enabled: true },
        { text: '1 free Boost per month', enabled: true },
        { text: '3 free super likes per week', enabled: true },
        { text: '3 free first impressions/week', enabled: false, subtitle: 'Stand out with a message before matching.' }
      ]
    },
    platinum: {
      upgradeLikes: [
        { text: 'Unlimited likes', enabled: true },
        { text: 'See who likes you', enabled: true },
        { text: 'Priority Likes', enabled: true, subtitle: 'Your likes will be seen sooner with priority likes.' }
      ],
      enhanceExperience: [
        { text: 'Unlimited Rewinds', enabled: true },
        { text: '1 free Boost per month', enabled: true },
        { text: '3 free super likes per week', enabled: true },
        { text: '3 free first impressions/week', enabled: true, subtitle: 'Stand out with a message before matching.' }
      ],
      premiumDiscovery: [
        { text: 'Unlimited Rewinds', enabled: true },
        { text: '1 free Boost per month', enabled: true },
        { text: '3 free super likes per week', enabled: true },
        { text: '3 free first impressions/week', enabled: true, subtitle: 'Stand out with a message before matching.' }
      ]
    }
  };

  const getPlanDisplayName = (planName, type) => {
    if (type === 'plus') return 'Vibe +';
    if (type === 'gold') return 'Vibe GOLD';
    if (type === 'platinum') return 'Vibe PLATINUM';
    return planName;
  };

  const getPlanBadge = (type) => {
    if (type === 'gold') return 'GOLD';
    if (type === 'platinum') return 'PLATINUM';
    return null;
  };

  if (loading) {
    return (
      <div className="upgrade-loading">
        <img src="/images/logo.png" alt="Ybe Logo" className="loading-logo" />
      </div>
    );
  }

  return (
    <div className="upgrade-container">
      {/* Header */}
      <header className="upgrade-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Ybe Logo" className="header-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }} />
          <nav className="header-nav">
            <a href="#" className="nav-link">Matches</a>
            <a href="#" className="nav-link">Messages</a>
          </nav>
        </div>
        <div className="header-center">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search" className="search-input" />
          </div>
        </div>
        <div className="header-right">
          <button className="upgrade-btn">Upgrade now</button>
          <button className="icon-btn">
            <img src="/images/notification.png" alt="Notifications" className="notification-icon" />
          </button>
          <button className="icon-btn" onClick={() => navigate('/dashboard')}>
            <img src="/images/profile.png" alt="Profile" className="profile-icon-img" />
          </button>
        </div>
      </header>

      <div className="upgrade-content">
        <h1 className="upgrade-title">Upgrade Now & Get 50% Offer</h1>
        
        <div className="offer-banner">
          Save upto 71% on Premium Plans!!! Valid for limited period!
        </div>

        <div className="plans-grid">
          {plans.map((plan, index) => {
            const type = plan.type || getPlanType(plan.name);
            const features = planFeatures[type] || planFeatures.plus;
            const displayName = getPlanDisplayName(plan.name, type);
            const badge = getPlanBadge(type);

            const planImage = type === 'plus' ? '/images/ybe_plus.png' 
              : type === 'gold' ? '/images/ybe_gold.png' 
              : '/images/ybe_platinum.png';

            return (
              <div key={index} className={`plan-card plan-${type}`}>
                <div className={`plan-header header-${type}`}>
                  <img src={planImage} alt={displayName} className="plan-icon-large" />
                </div>

                <div className="plan-body">
                  <div className="feature-section">
                    <div className={`feature-title title-${type}`}>Upgrade your likes:</div>
                    <div className="feature-list">
                      {features.upgradeLikes.map((feature, idx) => (
                        <div key={idx} className="feature-item">
                          {feature.enabled ? (
                            <span className="checkmark">✓</span>
                          ) : (
                            <span className="lock">🔒</span>
                          )}
                          <span className={feature.enabled ? '' : 'disabled'}>{feature.text}</span>
                          {feature.subtitle && (
                            <div className="feature-subtitle">{feature.subtitle}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="feature-section">
                    <div className={`feature-title title-${type}`}>Enhance your Experience:</div>
                    <div className="feature-list">
                      {features.enhanceExperience.map((feature, idx) => (
                        <div key={idx} className="feature-item">
                          {feature.enabled ? (
                            <span className="checkmark">✓</span>
                          ) : (
                            <span className="lock">🔒</span>
                          )}
                          <span className={feature.enabled ? '' : 'disabled'}>{feature.text}</span>
                          {feature.subtitle && (
                            <div className="feature-subtitle">{feature.subtitle}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="feature-section">
                    <div className={`feature-title title-${type}`}>Premium Discovery:</div>
                    <div className="feature-list">
                      {features.premiumDiscovery.map((feature, idx) => (
                        <div key={idx} className="feature-item">
                          {feature.enabled ? (
                            <span className="checkmark">✓</span>
                          ) : (
                            <span className="lock">🔒</span>
                          )}
                          <span className={feature.enabled ? '' : 'disabled'}>{feature.text}</span>
                          {feature.subtitle && (
                            <div className="feature-subtitle">{feature.subtitle}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button className="plan-button">
                  Starting at {currency.symbol}{plan.cost}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

