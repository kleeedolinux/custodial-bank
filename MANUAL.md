# MNFUS Custodial Bank System Manual

## Table of Contents
1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Admin Guide](#admin-guide)
6. [User Guide](#user-guide)
7. [Technical Reference](#technical-reference)
8. [Troubleshooting](#troubleshooting)

## Introduction

MNFUS is a customizable custodial bank system designed to manage digital assets on the Solana blockchain. The system provides a secure way to store SOL and custom tokens, with features including:

- User account management with PIN protection
- Wallet generation and management
- Deposit and withdrawal functionality
- Admin dashboard for user approval and system management
- Transaction tracking and history
- Customizable branding and theming

## System Requirements

- Node.js (v14 or higher)
- NPM (v6 or higher)
- SQLite (for development) or PostgreSQL (for production)
- Modern web browser

## Installation

### Clone the Repository

```bash
git clone <repository-url>
cd MNFUS
```

### Install Dependencies

```bash
npm install
```

### Set Up Database

1. Create a `.env` file in the project root:

```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="your-strong-session-secret"
```

2. Run database migrations:

```bash
npx prisma migrate dev --name init
```

3. Seed initial data:

```bash
npm run seed
```

### Start the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Configuration

### Initial Admin Setup

When you first run the application, an admin account is automatically created with the following credentials:
- Username: `admin`
- Password: `admin123`

**Important:** Change these credentials immediately after first login.

### Bank Settings

After logging in as admin, navigate to the Bank Settings page to configure:

1. **Bank Information**
   - Bank Name: The name displayed throughout the application

2. **Theme Colors**
   - Primary Color: Main accent color (hex format, e.g., #3B82F6)
   - Secondary Color: Secondary accent color (hex format, e.g., #4F46E5)

3. **Token Settings**
   - Token Symbol: The symbol for your custom token (e.g., USDC, MNFT)
   - Token Address: The Solana address for your token

4. **Admin Credentials**
   - Admin Username: Change the default username
   - Admin Password: Set a strong password

### Database Configuration

For production environments, it's recommended to use PostgreSQL instead of SQLite:

1. Update the `.env` file:
```
DATABASE_URL="postgresql://username:password@localhost:5432/mydb"
```

2. Run migrations again:
```bash
npx prisma migrate deploy
```

## Admin Guide

### Admin Dashboard

The admin dashboard provides an overview of the system, including:
- Pending user approvals
- Total registered users
- User balances

### User Management

#### Approving Users
1. Navigate to Admin Dashboard
2. Find the user in the "Pending Approvals" section
3. Click the "Approve" button

#### User Details
1. Click on a username in the users list
2. View detailed information including:
   - User information
   - Balance details
   - Wallet information
   - Transaction history

### Transaction Monitoring

1. Navigate to "All Transactions" in the admin menu
2. Use filters to view specific transaction types:
   - All transactions
   - Deposits
   - Withdrawals
   - SOL transactions
   - Token transactions

### System Customization

Update the system appearance and behavior through the Bank Settings page:

1. Change bank name and branding
2. Update theme colors
3. Configure token settings
4. Update admin credentials

## User Guide

### Registration and Account Setup

1. **Register an Account**
   - Provide username, email, and password
   - Wait for admin approval

2. **Set PIN**
   - After approval, set a 4-digit PIN
   - This PIN encrypts your wallet's private key
   - **Important:** PINs cannot be recovered if lost

3. **Access Dashboard**
   - View balances
   - See recent transactions

### Managing Funds

#### Depositing Funds
1. Navigate to "Deposit" in the sidebar
2. Enter amount to deposit
3. Select currency (SOL or token)
4. Enter PIN to confirm
5. Click "Deposit Funds"

#### Withdrawing Funds
1. Navigate to "Withdraw" in the sidebar
2. Enter amount to withdraw
3. Select currency (SOL or token)
4. Enter PIN to confirm
5. Click "Withdraw Funds"

### Wallet Management

1. **View Wallet Information**
   - Navigate to "Wallet Info" in the sidebar
   - View your public key
   - See token information

2. **Access Private Key** (use with caution)
   - Enter PIN
   - Click "View Private Key"
   - Copy key if needed

### Transaction History

1. Navigate to "Transaction History" in the sidebar
2. View all your transactions
3. Filter by:
   - All transactions
   - Deposits
   - Withdrawals
   - SOL transactions
   - Token transactions

## Technical Reference

### Project Structure

```
MNFUS/
├── middleware/     # Authentication middleware
├── prisma/         # Database schema and migrations
├── public/         # Static assets
├── routes/         # Express routes
│   ├── admin.js    # Admin routes
│   ├── auth.js     # Authentication routes
│   ├── dashboard.js # User dashboard routes
│   └── index.js    # Main routes
├── utils/          # Utility functions
│   └── crypto.js   # Cryptographic functions
├── views/          # EJS templates
│   ├── admin/      # Admin views
│   ├── auth/       # Authentication views
│   ├── dashboard/  # User dashboard views
│   └── layouts/    # Layout templates
└── server.js       # Application entry point
```

### Database Schema

The system uses three main models:

1. **User**
   - Personal information (email, username)
   - Authentication (password, PIN)
   - Wallet information (publicKey, encryptedPrivateKey)
   - Balances (solBalance, tokenBalance)

2. **Transaction**
   - Type (deposit, withdrawal)
   - Currency (SOL, token)
   - Amount and status
   - Timestamps

3. **Setting**
   - Bank configuration
   - Theme colors
   - Token information
   - Admin credentials

### Security Features

1. **Password Protection**
   - Passwords are hashed using bcrypt

2. **PIN Encryption**
   - PINs are used to encrypt private keys
   - PBKDF2 is used for key derivation

3. **Private Key Management**
   - Private keys are never stored in plaintext
   - AES encryption is used for private key storage

## Troubleshooting

### Common Issues

#### Database Migration Errors

**Issue**: Error when running migrations
**Solution**:
```bash
# Reset migration history
npx prisma migrate reset
# Create new migration
npx prisma migrate dev --name init
```

#### User Cannot Access Their Wallet

**Issue**: User forgot PIN
**Solution**: PINs cannot be recovered. Admin must:
1. Reset the user's PIN and wallet:
   ```sql
   -- Run in prisma studio or database client
   UPDATE User SET pin = NULL, publicKey = NULL, encryptedPrivateKey = NULL WHERE id = <user_id>;
   ```
2. Have the user log in and set a new PIN

#### Connection Issues

**Issue**: Database connection errors
**Solution**: Verify the DATABASE_URL in .env is correct

#### High Disk Usage

**Issue**: SQLite database growing too large
**Solution**: Consider migrating to PostgreSQL for production use 