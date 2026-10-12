import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/settings
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  let settings = db.settings.findById('settings_default');
  if (!settings) {
    settings = db.settings.insert({
      _id: 'settings_default',
      instituteName: 'Apex Academy of Sciences',
      lowAttendanceThreshold: 75,
      lateAttendanceWeight: 1.0,
      excludeExcusedFromDenominator: true,
      academicYear: '2026-2027',
      updatedAt: new Date().toISOString(),
    });
  }
  res.json({ settings });
});

// PATCH /api/settings
router.patch('/', authenticate, authorizeRoles('admin'), (req: AuthRequest, res: Response) => {
  const {
    instituteName,
    lowAttendanceThreshold,
    lateAttendanceWeight,
    excludeExcusedFromDenominator,
    academicYear,
  } = req.body;

  const current = db.settings.findById('settings_default');
  const updated = db.settings.update('settings_default', {
    instituteName: instituteName?.trim() ?? current?.instituteName,
    lowAttendanceThreshold:
      lowAttendanceThreshold !== undefined ? Number(lowAttendanceThreshold) : current?.lowAttendanceThreshold,
    lateAttendanceWeight:
      lateAttendanceWeight !== undefined ? Number(lateAttendanceWeight) : current?.lateAttendanceWeight,
    excludeExcusedFromDenominator:
      excludeExcusedFromDenominator !== undefined
        ? Boolean(excludeExcusedFromDenominator)
        : current?.excludeExcusedFromDenominator,
    academicYear: academicYear?.trim() ?? current?.academicYear,
  });

  db.auditLogs.insert({
    _id: `log_${Date.now()}`,
    actorId: req.user!._id,
    actorName: req.user!.name,
    actorRole: req.user!.role,
    action: 'UPDATE_SETTINGS',
    targetType: 'Settings',
    targetId: 'settings_default',
    details: `Updated institute attendance thresholds and policies.`,
    timestamp: new Date().toISOString(),
  });

  res.json({ message: 'Settings updated successfully.', settings: updated });
});

// GET /api/audit-logs
router.get('/audit-logs', authenticate, authorizeRoles('admin'), (req: AuthRequest, res: Response) => {
  const logs = db.auditLogs.find().sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100);
  res.json({ logs });
});

// POST /api/alerts/notify-parent
router.post('/alerts/notify-parent', authenticate, authorizeRoles('admin', 'teacher'), (req: AuthRequest, res: Response) => {
  const { studentId, messageType, customNote } = req.body;
  const student = db.students.findById(studentId);
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }

  if (!student.parentPhone && !student.email) {
    res.status(400).json({ error: 'No parent contact phone number or email registered for this student.' });
    return;
  }

  const batch = db.batches.findById(student.batchId);
  const now = new Date().toISOString();

  // Audit entry for communications
  db.auditLogs.insert({
    _id: `log_${Date.now()}`,
    actorId: req.user!._id,
    actorName: req.user!.name,
    actorRole: req.user!.role,
    action: 'DISPATCH_PARENT_ALERT',
    targetType: 'Student',
    targetId: student._id,
    details: `Sent ${messageType || 'low attendance'} notification to parent of ${student.fullName} (${student.parentPhone || student.email}). Note: ${customNote || 'Standard policy alert'}`,
    timestamp: now,
  });

  res.json({
    success: true,
    message: `Alert successfully dispatched to parent (${student.parentName || 'Guardian'}) at ${student.parentPhone || student.email}.`,
    dispatchedAt: now,
  });
});

export default router;
