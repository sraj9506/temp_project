const express = require('express');
const Razorpay = require('razorpay');
const User = require('../models/userModel');
const Subscription = require('../models/Subscription');
const authenticateToken = require('../middleware/authMiddleware');
const crypto = require('crypto'); // Import crypto for signature verification
require('dotenv').config();

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create an order
router.post('/order', async (req, res) => {
  const { planValue } = req.body;

  // Ensure planValue is provided and is a number
  if (!planValue || typeof planValue !== 'number') {
    return res.status(400).json({ error: 'Invalid plan value' });
  }

  const options = {
    amount: planValue * 100, // Amount in smallest currency unit (paise)
    currency: 'INR',
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify the payment
// router.post('/verify', authenticateToken, async (req, res) => {
//   const { orderId, paymentId, planValue, signature } = req.body; // Include signature

//   // Validate the received data
//   if (!orderId || !paymentId || !planValue || !signature) {
//     return res.status(400).json({ error: 'Order ID, Payment ID, Plan Value, and Signature are required' });
//   }

//   const userId = req.user.id; // Get user ID from the decoded token

//   try {
//     // Create a string to verify the payment signature
//     const body = orderId + "|" + paymentId;

//     // Generate the expected signature using your key secret
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET) // Use your Razorpay key secret
//       .update(body)
//       .digest('hex');

//     // Compare the expected signature with the received signature
//     if (expectedSignature !== signature) {
//       return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
//     }

//     // Create a new subscription record
//     const subscription = new Subscription({
//       userId,
//       paymentId,
//       plan: 'Your Plan Title Here', // Customize or retrieve this as needed
//       price: planValue,
//       startDate: new Date(),
//       duration: 30, // Set subscription duration
//       expirationDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
//     });

//     // Save subscription to database
//     await subscription.save();

//     // Send a success response
//     res.json({ success: true, message: 'Payment verified and subscription updated' });
//   } catch (error) {
//     console.error('Error verifying payment:', error);
//     res.status(500).json({ error: 'Payment verification failed. Please contact support.' });
//   }
// });
router.post('/verify', authenticateToken, async (req, res) => {
  const { orderId, paymentId, planTitle, planValue, signature } = req.body;

  // Ensure all required fields are present
  if (!orderId || !paymentId || !planTitle || !planValue || !signature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const userId = req.user.id;
  

  try {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Determine duration based on the plan title
    const duration = planTitle === "1 Month" ? 30 : planTitle === "2 Months" ? 60 : 90;
    const expirationDate = new Date(new Date().setDate(new Date().getDate() + duration));

    // Create a new subscription record with the required plan field
    const subscription = new Subscription({
      userId,
      paymentId,
      planTitle,
      plan: planTitle, // Assuming `plan` can be set to `planTitle`. Adjust as needed.
      price: planValue,
      startDate: new Date(),
      duration,
      expirationDate,
    });

    // Save the subscription to the database
    const savedSubscription = await subscription.save();

    // Update the User model with hasSubscription and subscriptionDetails
    await User.findByIdAndUpdate(userId, {
      hasSubscription: true,
      subscriptionDetails: savedSubscription._id
    });

    // Send a success response
    res.json({ success: true, message: 'Payment verified and subscription updated' });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Payment verification failed. Please contact support.' });
  }
});


module.exports = router;
