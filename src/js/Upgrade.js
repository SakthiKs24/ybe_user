import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { createCheckoutSession } from './services/stripeService';
import '../css/Upgrade.css';

export default function Upgrade({ embedded = false }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState({ code: 'GBP', symbol: '£' });
  const [userCountry, setUserCountry] = useState('GB');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(null); // Track which plan is processing
  const [userData, setUserData] = useState(null);
  const [userSubscription, setUserSubscription] = useState(null);

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

  // Fetch current user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userDocData = userDoc.data();
            setUserData({
              uid: user.uid,
              email: user.email,
              userId: userDocData.userId || userDoc.id,
              ...userDocData
            });
            // Set user subscription if exists
            if (userDocData.subscriptions) {
              setUserSubscription(userDocData.subscriptions);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Detect user country from stored location (permission already granted during login)
  useEffect(() => {
    const detectCountry = () => {
      try {
        // First, try to get country from user's stored location (from login)
        if (userData?.currentPosition?.countryCode) {
          const countryCode = userData.currentPosition.countryCode.toUpperCase();
          setUserCountry(countryCode);
          
          const currencyCode = currencyMap[countryCode] || 'GBP';
          const currencySymbol = currencySymbolMap[countryCode] || '£';
          setCurrency({ code: currencyCode, symbol: currencySymbol });
          
          console.log('Country detected from stored location:', { 
            countryCode, 
            currencyCode, 
            currencySymbol 
          });
          return;
        }

        // Fallback: Use browser's locale to detect country
        const locale = navigator.language || navigator.userLanguage || 'en-GB';
        const region = locale.split('-')[1] || locale.split('_')[1] || 'GB';
        
        // Convert to uppercase for country code
        const countryCode = region.toUpperCase();
        setUserCountry(countryCode);
        
        const currencyCode = currencyMap[countryCode] || 'GBP';
        const currencySymbol = currencySymbolMap[countryCode] || '£';
        setCurrency({ code: currencyCode, symbol: currencySymbol });
        
        console.log('Country detected from browser locale (fallback):', { 
          locale, 
          countryCode, 
          currencyCode, 
          currencySymbol 
        });
      } catch (error) {
        console.error('Error detecting country:', error);
        // Default to GB
        setUserCountry('GB');
        setCurrency({ code: 'GBP', symbol: '£' });
      }
    };

    // Only detect country when userData is available
    if (userData) {
      detectCountry();
    }
  }, [userData]);

  // Fetch currency conversion rate from pair API (matching Flutter getCurrencyConversionMethodss)
  const fetchCurrencyConversion = async (targetCurrency) => {
    try {
      // Use the pair API endpoint: GBP/$currency
      const url = `https://v6.exchangerate-api.com/v6/27aa2996e2f324ccee797a24/pair/GBP/${targetCurrency}`;
      console.log('Fetching currency conversion from:', url);
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Currency conversion API response:', data);
        
        // Parse the response similar to CurrencyConversionResponseModel
        const result = data.result || '';
        const conversionRate = data.conversion_rate || 1.0;

        if (result === 'success' && conversionRate) {
          // Save to localStorage (matching Flutter Prefs)
          const now = new Date().toISOString();
          localStorage.setItem('lastCurrencyConversionCall', now);
          localStorage.setItem('conversionRate', conversionRate.toString());
          localStorage.setItem('lastCurrencyCode', targetCurrency); // Store which currency this rate is for

          console.log('Saved conversion rate to localStorage:', { rate: conversionRate, currency: targetCurrency });
          return {
            conversionRate: parseFloat(conversionRate),
            result: result
          };
        }
      } else {
        console.error('Currency conversion API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching currency conversion:', error);
    }

    return {
      conversionRate: 1.0,
      result: 'error'
    };
  };

  // Apply currency conversion to plans (matching Flutter getCurrencyConversionMethodss)
  const applyCurrencyConversion = async (planArray, targetCurrency, targetCountryCode) => {
    try {
      console.log('Applying currency conversion:', { targetCurrency, targetCountryCode, planArray });
      
      // Get discount rate from user data (matching Flutter: userDetails.currentDiscountPercentage)
      let discountRate = 1.0;
      if (userData?.currentDiscountPercentage != null) {
        discountRate = (100 - userData.currentDiscountPercentage) / 100;
        console.log('Discount rate applied:', discountRate);
      }

      // Check if currency conversion was called today (within 24 hours) - using localStorage
      let isCurrencyConversionRateCalledToday = false;
      const lastCurrencyConversionCall = localStorage.getItem('lastCurrencyConversionCall');
      const lastCurrencyCode = localStorage.getItem('lastCurrencyCode');
      
      // Only use cache if it's for the same currency
      if (lastCurrencyConversionCall && lastCurrencyConversionCall !== '' && lastCurrencyCode === targetCurrency) {
        const now = new Date();
        const lastCall = new Date(lastCurrencyConversionCall);
        const hoursDiff = (now - lastCall) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          isCurrencyConversionRateCalledToday = true;
          console.log('Using cached conversion rate (within 24 hours)');
        } else {
          console.log('Cached rate expired (older than 24 hours)');
        }
      } else {
        console.log('No valid cache found or currency mismatch:', { lastCurrencyCode, targetCurrency });
      }

      let conversionRate = 1.0;

      if (isCurrencyConversionRateCalledToday) {
        // Use cached conversion rate from localStorage
        const cachedRate = localStorage.getItem('conversionRate');
        conversionRate = cachedRate ? parseFloat(cachedRate) : 1.0;
        if (conversionRate === 0.0) {
          conversionRate = 1.0;
        }
        console.log('Using cached conversion rate:', conversionRate);

        // Apply conversion with discount rate
        const converted = planArray.map(plan => {
          const rate = conversionRate;
          const convertedCost = plan.cost * rate * discountRate;
          console.log(`Converting ${plan.name}: ${plan.cost} GBP × ${rate} × ${discountRate} = ${convertedCost} ${targetCurrency}`);
          return {
            ...plan,
            cost: parseFloat(convertedCost.toFixed(2))
          };
        });
        return converted;
      } else {
        // Fetch new conversion rate from API
        if (targetCurrency && targetCurrency !== 'GBP') {
          console.log('Fetching new conversion rate for:', targetCurrency);
          const conversionData = await fetchCurrencyConversion(targetCurrency);
          
          if (conversionData.result === 'success' && conversionData.conversionRate) {
            conversionRate = conversionData.conversionRate || 1.0;
            console.log('Fetched conversion rate:', conversionRate);

            // Apply conversion with discount rate
            const converted = planArray.map(plan => {
              const rate = conversionRate;
              const convertedCost = plan.cost * rate * discountRate;
              console.log(`Converting ${plan.name}: ${plan.cost} GBP × ${rate} × ${discountRate} = ${convertedCost} ${targetCurrency}`);
              return {
                ...plan,
                cost: parseFloat(convertedCost.toFixed(2))
              };
            });
            return converted;
          } else {
            console.log('Failed to fetch conversion rate, using original plans');
          }
        } else {
          console.log('Currency is GBP or not set, no conversion needed');
        }
      }
    } catch (error) {
      console.error('Error applying currency conversion:', error);
    }

    console.log('Returning original plans (no conversion applied)');
    return planArray;
  };

  // Fetch subscription plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const docRef = doc(db, 'subscription', 'plans');
        const docSnap = await getDoc(docRef);

        let planArray = [];

        if (docSnap.exists()) {
          const data = docSnap.data();

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
        } else {
          // Default plans if Firestore doesn't have data
          planArray = [
            { name: 'Ybe Plus', cost: 20, validityDays: 30, type: 'plus' },
            { name: 'Ybe Premium', cost: 50, validityDays: 90, type: 'premium' },
            { name: 'Ybe Gold', cost: 90, validityDays: 180, type: 'gold' }
          ];
        }

        // Apply currency conversion (matching Flutter getCurrencyConversionMethod)
        if (currency.code && userData && userCountry) {
          const convertedPlans = await applyCurrencyConversion(planArray, currency.code, userCountry);
          setPlans(convertedPlans);
        } else {
          // Set plans without conversion if currency or user data not ready
          setPlans(planArray);
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

    // Fetch plans when both currency and user data are available
    if (currency.code && userData) {
      fetchPlans();
    }
  }, [currency.code, userData]);

  const getPlanType = (planName) => {
    const name = planName.toLowerCase();
    if (name.includes('plus')) return 'plus';
    if (name.includes('gold')) return 'gold';
    if (name.includes('platinum') || name.includes('premium')) return 'premium';
    return 'plus';
  };

  const planFeatures = {
    plus: [
      { text: 'One month Subscription', enabled: true },
      { text: 'Unlimited Likes', enabled: true },
      { text: 'Unlimited Swipes', enabled: true },
      { text: 'Unlimited Messages', enabled: true },
      { text: 'See who liked you', enabled: true },
      { text: 'Open to match page', enabled: true },
      { text: 'Get a free star on the profile', enabled: false }
    ],
    premium: [
      { text: 'Three month Subscription', enabled: true },
      { text: 'Six month Subscription', enabled: false },
      { text: 'Unlimited Likes', enabled: true },
      { text: 'Unlimited Swipes', enabled: true },
      { text: 'Unlimited Messages', enabled: true },
      { text: 'See who liked you', enabled: true },
      { text: 'Open to match page', enabled: true },
      { text: 'Get a free star on the profile', enabled: true },
      { text: 'Get two star on the profile.', enabled: false },
      { text: 'One Profile boost to enhance the profile', enabled: true },
      { text: 'Three Profile boost to enhance the profile', enabled: false }
    ],
    gold: [
      { text: 'Six month Subscription', enabled: true },
      { text: 'Unlimited Likes', enabled: true },
      { text: 'Unlimited Swipes', enabled: true },
      { text: 'Unlimited Messages', enabled: true },
      { text: 'See who liked you', enabled: true },
      { text: 'Open to match page', enabled: true },
      { text: 'Get two star on the profile.', enabled: true },
      { text: 'Three Profile boost to enhance the profile', enabled: true }
    ]
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

  const handlePayment = async (plan) => {
    if (!userData) {
      toast.error('Please login to continue');
      navigate('/');
      return;
    }

    // Check if user is already subscribed to this plan
    if (userSubscription?.planName) {
      // Use exact plan name from Flutter constants
      const currentPlan = plan.name; // Should be "Ybe Plus", "Ybe Premium", or "Ybe Gold"
      
      if (userSubscription.planName === currentPlan) {
        // Check if subscription is still valid
        if (userSubscription.validUntil) {
          const validUntil = new Date(userSubscription.validUntil);
          if (validUntil > new Date()) {
            toast.info('You are already subscribed to this plan');
            return;
          }
        }
      }
    }

    setPaymentLoading(plan.name); // Track which plan is processing
    try {
      console.log('Payment initiated:', {
        plan: plan.name,
        amount: plan.cost,
        currency: currency.code,
        symbol: currency.symbol
      });
      
      await createCheckoutSession(
        plan,
        userData.userId || userData.uid,
        userData.email,
        currency.code
      );
      // Note: setPaymentLoading(null) is not needed here as user will be redirected
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to initiate payment. Please try again.');
      setPaymentLoading(null);
    }
  };
  
  // Helper function to check if plan is subscribed
  const isPlanSubscribed = (plan) => {
    if (!userSubscription?.planName) return false;
    
    // Use exact plan name from Flutter constants
    const planName = plan.name; // Should be "Ybe Plus", "Ybe Premium", or "Ybe Gold"
    
    if (userSubscription.planName === planName) {
      // Check if subscription is still valid
      if (userSubscription.validUntil) {
        const validUntil = new Date(userSubscription.validUntil);
        return validUntil > new Date();
      }
    }
    return false;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear localStorage to prevent auth state restoration
      localStorage.removeItem('userDetails');
      toast.success('Logged out successfully!', {
        position: "top-right",
        autoClose: 2000,
      });
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="upgrade-loading">
        <img src="/images/logo.png" alt="Ybe Logo" className="loading-logo" />
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="upgrade-embedded">
        <div className="plans-grid">
          {plans.map((plan, index) => {
            const type = plan.type || getPlanType(plan.name);
            const displayName = getPlanDisplayName(plan.name, type);
            const planImage = type === 'plus' ? '/images/ybe_plus.png' 
              : type === 'premium' ? '/images/ybe_gold.png' 
              : '/images/ybe_platinum.png';
            return (
              <div key={index} className={`plan-card plan-${type}`}>
                <div className={`plan-header header-${type}`}>
                  <img src={planImage} alt={displayName} className="plan-icon-large" />
                </div>
                <div className="plan-body" style={{ padding: '16px' }}>
                  <div className={`feature-title title-${type}`} style={{ marginBottom: 8 }}>
                    {displayName}
                  </div>
                  <div className="price-line" style={{ fontWeight: 600 }}>
                    Starting at {currency.symbol}{plan.cost}
                  </div>
                </div>
                <button 
                  className="plan-button"
                  onClick={() => handlePayment(plan)}
                  disabled={paymentLoading === plan.name || isPlanSubscribed(plan)}
                >
                  {paymentLoading === plan.name 
                    ? 'Processing...' 
                    : isPlanSubscribed(plan)
                    ? 'Subscribed'
                    : 'Upgrade'
                  }
                </button>
              </div>
            );
          })}
        </div>
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
            <a href="/dashboard" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Matches</a>
            <a href="/chat" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/chat'); }}>Messages</a>
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
          <button className="icon-btn" onClick={() => setShowLogoutModal(true)}>
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
            const planImage = type === 'plus' ? '/images/ybe_plus.png' 
              : type === 'premium' ? '/images/ybe_gold.png' 
              : '/images/ybe_platinum.png';
            const planTitle = type === 'plus' ? 'Upgrade to Plus' 
              : type === 'premium' ? 'Upgrade to Premium'
              : 'Upgrade to Gold';
            return (
              <div key={index} className={`plan-card plan-${type}`}>
                <div className={`plan-header header-${type}`}>
                  <img src={planImage} alt={displayName} className="plan-icon-large" />
                </div>

                <div className="plan-body">
                  <div className="feature-section">
                    <div className={`feature-title title-${type}`}>{planTitle}</div>
                    <div className="feature-list">
                      {features.map((feature, idx) => (
                        <div key={idx} className="feature-item">
                          {feature.enabled ? (
                            <span className="checkmark">✓</span>
                          ) : (
                            <span className="lock">🔒</span>
                          )}
                          <span className={feature.enabled ? '' : 'disabled'}>{feature.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  className="plan-button"
                  onClick={() => handlePayment(plan)}
                  disabled={paymentLoading === plan.name || isPlanSubscribed(plan)}
                >
                  {paymentLoading === plan.name 
                    ? 'Processing...' 
                    : isPlanSubscribed(plan)
                    ? 'Subscribed'
                    : `Starting at ${currency.symbol}${plan.cost}`
                  }
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="modal-buttons">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
                className="btn-confirm"
              >
                Yes, Sure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

