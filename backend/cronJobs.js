const cron = require('node-cron');
const { User } = require('./models/userModel'); // Your User model path
const { Subscription } = require('./models/Subscription'); // Your Subscription model path

// Schedule task to run every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    // Find all subscriptions where expiration date is less than today's date
    const expiredSubscriptions = await Subscription.find({ expirationDate: { $lt: new Date() } });

    // Update the user and subscription records
    for (let subscription of expiredSubscriptions) {
      // Update the user's hasSubscription field
      await User.findByIdAndUpdate(subscription.userId, {
        hasSubscription: false,
        subscriptionDetails: null,  // Clear subscription details if needed
      });

      // Update the subscription record as expired or inactive
      subscription.status = 'expired'; // You can add more details here as needed
      await subscription.save();
    }

    console.log('Expired subscriptions have been updated successfully.');
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
  }
});
