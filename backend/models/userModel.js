const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  isFirst:{
    type: Boolean,
    required: true,
    default: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /.+\@.+\..+/ // Basic email format validation
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String, // Store the OTP temporarily
  },
  hasSubscription: {
    type: Boolean,
    default: false,
  },
  subscriptionDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: false, // This can be optional in case a user does not have a subscription
  },
  lastLogin: {
    type: Date, // Track the last login time
  },
}, { timestamps: true }); // Added timestamps

// Hash the password before saving the user model
userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error); // Pass the error to the next middleware
  }
});

module.exports = mongoose.model('User', userSchema);
