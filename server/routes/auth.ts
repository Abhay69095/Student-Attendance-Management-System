import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, UserDoc } from '../db.js';
import { authenticate, AuthRequest, generateToken } from '../middleware/auth.js';

const router = Router();

function sanitizeUser(user: UserDoc) {
  const { passwordHash, resetPasswordToken, resetPasswordExpires, ...safe } = user;
  return safe;
}

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = db.users.findOne((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account has been deactivated. Please contact administrator.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    const token = generateToken(user);

    // Set secure HTTP-only cookie compatible with iframe environments
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.json({
      message: 'Login successful.',
      user: sanitizeUser(user),
      token, // Also return for non-cookie client flexibility
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failure: ' + (err.message || 'Server error') });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res: Response) => {
  res.clearCookie('auth_token', { path: '/' });
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated.' });
    return;
  }
  res.json({ user: sanitizeUser(req.user) });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }

  const user = db.users.findOne((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    // For security, give generic confirmation
    res.json({ message: 'If that email is registered, a password reset link has been dispatched.' });
    return;
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  const expires = Date.now() + 3600000; // 1 hour

  db.users.update(user._id, {
    resetPasswordToken: resetToken,
    resetPasswordExpires: expires,
  });

  // Log in audit
  db.auditLogs.insert({
    _id: `log_${Date.now()}`,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'FORGOT_PASSWORD_REQUEST',
    targetType: 'User',
    targetId: user._id,
    details: 'Password reset token generated.',
    timestamp: new Date().toISOString(),
  });

  res.json({
    message: 'If that email is registered, a password reset link has been dispatched.',
    // Returning resetToken for demo test convenience in mock environments
    demoResetToken: resetToken,
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Reset token and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const user = db.users.findOne(
      (u) => u.resetPasswordToken === token && !!u.resetPasswordExpires && u.resetPasswordExpires > Date.now()
    );

    if (!user) {
      res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    db.users.update(user._id, {
      passwordHash,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      mustChangePassword: false,
    });

    db.auditLogs.insert({
      _id: `log_${Date.now()}`,
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'PASSWORD_RESET_SUCCESS',
      targetType: 'User',
      targetId: user._id,
      details: 'Password successfully reset via token.',
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Password has been successfully updated. You may now log in.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Reset password error: ' + (err.message || 'Server error') });
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    const user = db.users.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    db.users.update(user._id, {
      passwordHash,
      mustChangePassword: false,
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Password update error.' });
  }
});

export default router;
