// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in to access this page');
  res.redirect('/auth/login');
}

// Middleware to check if user is an admin
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) {
    return next();
  }
  req.flash('error_msg', 'Access denied. Admin privileges required');
  res.redirect('/dashboard');
}

// Middleware to check if user has a PIN set
function hasPinSet(req, res, next) {
  if (req.session.user && req.session.user.pin) {
    return next();
  }
  if (req.session.user) {
    req.flash('error_msg', 'Please set your PIN first');
    return res.redirect('/auth/set-pin');
  }
  req.flash('error_msg', 'Please log in to access this page');
  res.redirect('/auth/login');
}

// Middleware to check if user is approved
function isApproved(req, res, next) {
  if (req.session.user && req.session.user.isApproved) {
    return next();
  }
  if (req.session.user) {
    req.flash('error_msg', 'Your account is pending approval');
    return res.redirect('/auth/pending');
  }
  req.flash('error_msg', 'Please log in to access this page');
  res.redirect('/auth/login');
}

// Middleware to check if user is NOT authenticated (for login/register pages)
function isNotAuthenticated(req, res, next) {
  if (!req.session.user) {
    return next();
  }
  res.redirect('/dashboard');
}

module.exports = {
  isAuthenticated,
  isAdmin,
  hasPinSet,
  isApproved,
  isNotAuthenticated
}; 