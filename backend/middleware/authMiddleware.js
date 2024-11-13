const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const existingUser = await User.findById(decoded.id);
      if (!existingUser) {
        return res.status(401).json({ message: 'User not found, please log in again' });
      }

      req.user = decoded; // Attach decoded token (user info) to request
      next();
    } catch (error) {
      console.error('Error verifying user existence:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
}

module.exports = authenticateToken;
