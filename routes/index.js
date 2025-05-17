const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Home route
router.get('/', async (req, res) => {
  try {
    const settings = await prisma.setting.findFirst();
    res.render('index', { 
      title: settings ? settings.bankName : 'Custodial Bank',
      settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.render('index', { 
      title: 'Custodial Bank',
      settings: null
    });
  }
});

module.exports = router; 