const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated, isNotAuthenticated } = require('../middleware/auth');
const { generateKeyFromPin, generateKeypair, encryptPrivateKey } = require('../utils/crypto');

const prisma = new PrismaClient();

// Login page
router.get('/login', isNotAuthenticated, async (req, res) => {
  const settings = await prisma.setting.findFirst();
  res.render('auth/login', { 
    title: 'Login', 
    settings 
  });
});

// Login process
router.post('/login', isNotAuthenticated, async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    // Check for admin credentials
    const settings = await prisma.setting.findFirst();
    if (username === settings.adminUsername) {
      const isMatch = await bcrypt.compare(password, settings.adminPassword);
      
      if (isMatch) {
        req.session.user = {
          id: 0, // Special ID for admin
          username: settings.adminUsername,
          isAdmin: true,
          isApproved: true
        };
        
        req.flash('success_msg', 'Welcome to the admin dashboard');
        return res.redirect('/admin/dashboard');
      }
    }
    
    // Check for regular user
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/auth/login');
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error_msg', 'Invalid password');
      return res.redirect('/auth/login');
    }
    
    // User is valid, set session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved,
      pin: user.pin
    };
    
    // If user has no PIN set, redirect to PIN setup
    if (!user.pin) {
      return res.redirect('/auth/set-pin');
    }
    
    // If user is not approved
    if (!user.isApproved) {
      return res.redirect('/auth/pending');
    }
    
    // Redirect to dashboard
    req.flash('success_msg', 'You are now logged in');
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error_msg', 'An error occurred during login');
    res.redirect('/auth/login');
  }
});

// Register page
router.get('/register', isNotAuthenticated, async (req, res) => {
  const settings = await prisma.setting.findFirst();
  res.render('auth/register', { 
    title: 'Register', 
    settings 
  });
});

// Register process
router.post('/register', isNotAuthenticated, async (req, res) => {
  const { username, email, password, password2 } = req.body;
  const errors = [];
  
  // Validation
  if (!username || !email || !password || !password2) {
    errors.push({ msg: 'Please fill in all fields' });
  }
  
  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }
  
  if (password.length < 6) {
    errors.push({ msg: 'Password should be at least 6 characters' });
  }
  
  if (errors.length > 0) {
    const settings = await prisma.setting.findFirst();
    return res.render('auth/register', {
      title: 'Register',
      errors,
      username,
      email,
      settings
    });
  }
  
  try {
    // Check if email already exists
    const emailExists = await prisma.user.findUnique({
      where: { email }
    });
    
    if (emailExists) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/auth/register');
    }
    
    // Check if username already exists
    const usernameExists = await prisma.user.findUnique({
      where: { username }
    });
    
    if (usernameExists) {
      req.flash('error_msg', 'Username already taken');
      return res.redirect('/auth/register');
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isAdmin: false,
        isApproved: false
      }
    });
    
    req.flash('success_msg', 'You are now registered and waiting for approval');
    res.redirect('/auth/login');
    
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error_msg', 'An error occurred during registration');
    res.redirect('/auth/register');
  }
});

// Set PIN page
router.get('/set-pin', isAuthenticated, async (req, res) => {
  if (req.session.user.pin) {
    req.flash('error_msg', 'PIN already set');
    return res.redirect('/dashboard');
  }
  
  const settings = await prisma.setting.findFirst();
  res.render('auth/set-pin', { 
    title: 'Set PIN',
    settings
  });
});

// Set PIN process
router.post('/set-pin', isAuthenticated, async (req, res) => {
  const { pin, confirmPin } = req.body;
  const userId = req.session.user.id;
  
  // Validation
  if (!pin || !confirmPin) {
    req.flash('error_msg', 'Please enter both PIN fields');
    return res.redirect('/auth/set-pin');
  }
  
  if (pin !== confirmPin) {
    req.flash('error_msg', 'PINs do not match');
    return res.redirect('/auth/set-pin');
  }
  
  if (pin.length !== 4 || isNaN(pin)) {
    req.flash('error_msg', 'PIN must be a 4-digit number');
    return res.redirect('/auth/set-pin');
  }
  
  try {
    // Generate a keypair
    const keypair = generateKeypair();
    
    // Generate a derivative key from PIN
    const derivedKey = generateKeyFromPin(pin);
    
    // Encrypt the private key
    const encryptedPrivateKey = encryptPrivateKey(keypair.privateKey, derivedKey);
    
    // Update user with PIN and keys
    await prisma.user.update({
      where: { id: userId },
      data: {
        pin,
        publicKey: keypair.publicKey,
        encryptedPrivateKey
      }
    });
    
    // Update session
    req.session.user.pin = pin;
    
    req.flash('success_msg', 'PIN set successfully. Your wallet has been created.');
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('Set PIN error:', error);
    req.flash('error_msg', 'An error occurred while setting PIN');
    res.redirect('/auth/set-pin');
  }
});

// Pending approval page
router.get('/pending', isAuthenticated, async (req, res) => {
  if (req.session.user.isApproved) {
    return res.redirect('/dashboard');
  }
  
  const settings = await prisma.setting.findFirst();
  res.render('auth/pending', { 
    title: 'Pending Approval',
    settings
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.redirect('/dashboard');
    }
    res.redirect('/auth/login');
  });
});

module.exports = router; 