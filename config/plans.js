// config/plans.js

export const PLANS = {
  free: {
    name: 'Free',
    monthlyCredits: 15,
    allowExtraCredits: false,
    historyAccess: false,
    removeAds: false,
  },

  basic: {
    name: 'Basic',
    monthlyCredits: 50,
    allowExtraCredits: true,
    historyAccess: true,
    removeAds: true,
  },

  premium: {
    name: 'Premium',
    monthlyCredits: 100,
    allowExtraCredits: true,
    historyAccess: true,
    removeAds: true,
    prioritySupport: true,
  },
};
