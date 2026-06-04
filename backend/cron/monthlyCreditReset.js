import cron from 'node-cron';
import User from '../models/User.js';

cron.schedule('0 0 1 * *', async () => {
  const users = await User.find();

  for (const user of users) {
    if (user.plan === 'free') user.credits = 10;
    if (user.plan === 'basic') user.credits = 50;
    if (user.plan === 'premium') user.credits = 80;

    user.extraCredits = 0;
    user.lastCreditReset = new Date();
    await user.save();
  }

  console.log('✅ Monthly credits reset');
});
