const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated, isApproved, hasPinSet } = require('../middleware/auth');
const { generateKeyFromPin, decryptPrivateKey } = require('../utils/crypto');

const prisma = new PrismaClient();

// Middleware to check all requirements before accessing dashboard
router.use(isAuthenticated, isApproved, hasPinSet);

// Dashboard home
router.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });
    
    const settings = await prisma.setting.findFirst();
    
    res.render('dashboard/index', {
      title: 'Dashboard',
      user,
      settings,
      tokenSymbol: settings.tokenSymbol
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error_msg', 'An error occurred while loading the dashboard');
    res.redirect('/');
  }
});

// Transaction history
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    const settings = await prisma.setting.findFirst();
    
    res.render('dashboard/transactions', {
      title: 'Transaction History',
      transactions,
      settings,
      tokenSymbol: settings.tokenSymbol
    });
  } catch (error) {
    console.error('Transactions error:', error);
    req.flash('error_msg', 'An error occurred while loading transactions');
    res.redirect('/dashboard');
  }
});

// Verify PIN middleware
const verifyPin = async (req, res, next) => {
  const { pin } = req.body;
  const userPin = req.session.user.pin;
  
  if (pin !== userPin) {
    req.flash('error_msg', 'Invalid PIN');
    return res.redirect(req.originalUrl);
  }
  
  next();
};

// Deposit form
router.get('/deposit', async (req, res) => {
  const settings = await prisma.setting.findFirst();
  res.render('dashboard/deposit', {
    title: 'Deposit Funds',
    settings,
    tokenSymbol: settings.tokenSymbol
  });
});

// Process deposit
router.post('/deposit', verifyPin, async (req, res) => {
  const { amount, currency, pin } = req.body;
  const userId = req.session.user.id;
  
  try {
    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        type: 'deposit',
        currency,
        amount: parseFloat(amount),
        status: 'completed'
      }
    });
    
    // Update user balance
    if (currency === 'SOL') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          solBalance: {
            increment: parseFloat(amount)
          }
        }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          tokenBalance: {
            increment: parseFloat(amount)
          }
        }
      });
    }
    
    req.flash('success_msg', `Deposited ${amount} ${currency} successfully`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Deposit error:', error);
    req.flash('error_msg', 'An error occurred during deposit');
    res.redirect('/dashboard/deposit');
  }
});

// Withdraw form
router.get('/withdraw', async (req, res) => {
  const userId = req.session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  const settings = await prisma.setting.findFirst();
  
  res.render('dashboard/withdraw', {
    title: 'Withdraw Funds',
    user,
    settings,
    tokenSymbol: settings.tokenSymbol
  });
});

// Process withdrawal
router.post('/withdraw', verifyPin, async (req, res) => {
  const { amount, currency, pin } = req.body;
  const userId = req.session.user.id;
  const parsedAmount = parseFloat(amount);
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    // Check sufficient balance
    if (currency === 'SOL' && user.solBalance < parsedAmount) {
      req.flash('error_msg', 'Insufficient SOL balance');
      return res.redirect('/dashboard/withdraw');
    }
    
    if (currency !== 'SOL' && user.tokenBalance < parsedAmount) {
      req.flash('error_msg', `Insufficient ${currency} balance`);
      return res.redirect('/dashboard/withdraw');
    }
    
    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        type: 'withdrawal',
        currency,
        amount: parsedAmount,
        status: 'completed'
      }
    });
    
    // Update user balance
    if (currency === 'SOL') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          solBalance: {
            decrement: parsedAmount
          }
        }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          tokenBalance: {
            decrement: parsedAmount
          }
        }
      });
    }
    
    req.flash('success_msg', `Withdrawn ${amount} ${currency} successfully`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Withdrawal error:', error);
    req.flash('error_msg', 'An error occurred during withdrawal');
    res.redirect('/dashboard/withdraw');
  }
});

// Wallet info
router.get('/wallet', async (req, res) => {
  const userId = req.session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  const settings = await prisma.setting.findFirst();
  
  res.render('dashboard/wallet', {
    title: 'Wallet Information',
    user,
    settings,
    publicKey: user.publicKey,
    tokenSymbol: settings.tokenSymbol,
    tokenAddress: settings.tokenAddress
  });
});

// Verify PIN and get private key
router.post('/wallet/show-private-key', verifyPin, async (req, res) => {
  const { pin } = req.body;
  const userId = req.session.user.id;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    // Generate derived key from PIN
    const derivedKey = generateKeyFromPin(pin);
    
    // Decrypt private key
    const privateKey = decryptPrivateKey(user.encryptedPrivateKey, derivedKey);
    
    // Send private key (in a real app, consider a more secure way to display this)
    res.json({ success: true, privateKey });
  } catch (error) {
    console.error('Private key display error:', error);
    res.status(500).json({ success: false, message: 'Failed to decrypt private key' });
  }
});

module.exports = router; 