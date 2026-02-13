import { PLANS } from '../../config/plans.js';

export const resetCreditsIfNeeded = (user) => {
  const now = new Date();
  const lastReset = new Date(user.lastCreditReset);

  const isNewMonth =
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear();

  if (isNewMonth) {
    user.credits = PLANS[user.plan].monthlyCredits;
    user.lastCreditReset = now;
  }
};
