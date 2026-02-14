const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Try multiple ways to get the Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization || req.get('Authorization');
    const token = authHeader?.replace('Bearer ', '')?.trim();
    
    if (!token) {
      console.log('❌ No token found. Headers:', {
        authorization: req.headers.authorization,
        Authorization: req.headers.Authorization,
        allHeaders: Object.keys(req.headers)
      });
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token is not valid. Please log in again.' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Token is not valid. Please log in again.' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ message: 'Authorization failed' });
  }
};

module.exports = { auth, adminAuth };
