require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// EJS setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 60 * 60 * 1000 // 1 hour
  }
}));

// Flash messages
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

// Initialize Settings
async function initializeSettings() {
  const settingsCount = await prisma.setting.count();
  
  if (settingsCount === 0) {
    const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, 10);
    
    await prisma.setting.create({
      data: {
        bankName: process.env.DEFAULT_BANK_NAME,
        primaryColor: process.env.DEFAULT_PRIMARY_COLOR,
        secondaryColor: process.env.DEFAULT_SECONDARY_COLOR,
        tokenAddress: process.env.DEFAULT_TOKEN_ADDRESS,
        tokenSymbol: process.env.DEFAULT_TOKEN_SYMBOL,
        adminUsername: process.env.DEFAULT_ADMIN_USERNAME,
        adminPassword: hashedPassword
      }
    });
    
    console.log('Default settings created');
  }
}

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/admin', require('./routes/admin'));

// Initialize and start server
async function startServer() {
  try {
    await prisma.$connect();
    console.log('Connected to database');
    
    await initializeSettings();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();