const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// Apply admin middleware to all routes
router.use(isAuthenticated, isAdmin);

// Admin dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const pendingUsers = users.filter(user => !user.isApproved);
    const approvedUsers = users.filter(user => user.isApproved);
    
    const settings = await prisma.setting.findFirst();
    
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      pendingUsers,
      approvedUsers,
      settings,
      tokenSymbol: settings.tokenSymbol
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash('error_msg', 'An error occurred while loading the admin dashboard');
    res.redirect('/');
  }
});

// Approve user
router.post('/approve-user/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isApproved: true }
    });
    
    req.flash('success_msg', 'User approved successfully');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('User approval error:', error);
    req.flash('error_msg', 'An error occurred while approving the user');
    res.redirect('/admin/dashboard');
  }
});

// Bank settings page
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.setting.findFirst();
    
    res.render('admin/settings', {
      title: 'Bank Settings',
      settings
    });
  } catch (error) {
    console.error('Settings page error:', error);
    req.flash('error_msg', 'An error occurred while loading settings');
    res.redirect('/admin/dashboard');
  }
});

// Update bank settings
router.post('/settings', async (req, res) => {
  const { 
    bankName, 
    primaryColor, 
    secondaryColor, 
    tokenAddress, 
    tokenSymbol,
    adminUsername,
    adminPassword
  } = req.body;
  
  try {
    const settings = await prisma.setting.findFirst();
    
    // If changing admin password, hash it
    const updateData = {
      bankName,
      primaryColor,
      secondaryColor,
      tokenAddress,
      tokenSymbol,
      adminUsername
    };
    
    // Only update password if provided
    if (adminPassword) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      updateData.adminPassword = hashedPassword;
    }
    
    await prisma.setting.update({
      where: { id: settings.id },
      data: updateData
    });
    
    req.flash('success_msg', 'Bank settings updated successfully');
    res.redirect('/admin/settings');
  } catch (error) {
    console.error('Settings update error:', error);
    req.flash('error_msg', 'An error occurred while updating settings');
    res.redirect('/admin/settings');
  }
});

// View all transactions
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const settings = await prisma.setting.findFirst();
    
    res.render('admin/transactions', {
      title: 'All Transactions',
      transactions,
      settings,
      tokenSymbol: settings.tokenSymbol
    });
  } catch (error) {
    console.error('Admin transactions error:', error);
    req.flash('error_msg', 'An error occurred while loading transactions');
    res.redirect('/admin/dashboard');
  }
});

// View user details
router.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/dashboard');
    }
    
    const settings = await prisma.setting.findFirst();
    
    res.render('admin/user-details', {
      title: `User: ${user.username}`,
      user,
      settings,
      tokenSymbol: settings.tokenSymbol
    });
  } catch (error) {
    console.error('User details error:', error);
    req.flash('error_msg', 'An error occurred while loading user details');
    res.redirect('/admin/dashboard');
  }
});

module.exports = router; 