const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { sendOTP } = require('../utils/email');
const dotenv = require('dotenv');
dotenv.config();
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
const jwtSecret = process.env.JWT_SECRET;

// Utility to generate a 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// Validate user endpoint
router.get('/validate', authenticateToken, async (req, res) => {
  try {
    // Find user by their ID from the request token
    const user = await User.findById(req.user.id);

    // If the user is found, include subscription status in the response
    if (user) {
      return res.json({ 
        valid: true, 
        hasSubscription: user.hasSubscription || false, // Assuming 'hasSubscription' is a field in your User model
        user 
      });
    }

    // If the user is not found, return valid as false
    return res.json({ valid: false });
  } catch (error) {
    console.error('Error validating user:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});


// ------------------- Signup Route -------------------
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });

    // If the user exists and is verified, return an error
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // If the user exists but is not verified, allow signup and send OTP
    if (existingUser && !existingUser.isVerified) {
      // Optionally, you can regenerate OTP for the existing user
      existingUser.otp = generateOTP();
      await existingUser.save();

      // Send OTP to the user's email
      await sendOTP(email, existingUser.otp);

      // Respond with success message indicating OTP was sent
      return res.status(200).json({ message: 'OTP sent to email', userId: existingUser._id });
    }

    // Create a new user object if the user does not exist
    const otp = generateOTP();
    const newUser = new User({ name, email, password, otp });

    // Save the user to the database
    await newUser.save();

    // Send OTP to the user's email
    await sendOTP(email, otp);

    // Respond with success message and user ID (to pass to OTP verification step)
    res.status(201).json({ message: 'OTP sent to email', userId: newUser._id });
  } catch (err) {
    console.error('Error during signup:', err); // Log detailed error
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------- OTP Verification Route -------------------
router.post('/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'Invalid user' });
    }

    // Check if OTP matches
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (Date.now() > user.otpExpiration) {
      return res.status(400).json({ message: 'OTP expired' });
    }

   // OTP is valid and not expired, proceed with successful verification
   user.otp = null; // Clear OTP after successful verification
   user.isVerified=true;
   user.otpExpiration = null;
   await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });

    // Respond with token and success message
    res.json({ message: 'Verification successful', token });
  } catch (err) {
    console.error('Error during OTP verification:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------- Resend OTP -------------------

const OTP_EXPIRY_TIME = 2 * 60 * 1000;

router.post('/resend-otp', async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {  
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP(); // Generate new OTP
    user.otp = otp;
    user.otpExpiry = Date.now() + OTP_EXPIRY_TIME; 
    await user.save();

    await sendOTP(user.email, otp); // Send new OTP via email
    res.json({ message: 'New OTP sent to your email', otpExpiry: user.otpExpiry });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


// ------------------- Login Route -------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    console.log('User found:', user); // Log the found user

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials: User not found' });
    }

    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: 'Invalid credentials: Please verify your email first' });
    }

    // Verify the password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch); // Log the password comparison result

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials: Incorrect password' });
    }

    // Generate JWT token
    const userData = { id: user._id, email: user.email, name: user.name  };
    const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Respond with the token
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
