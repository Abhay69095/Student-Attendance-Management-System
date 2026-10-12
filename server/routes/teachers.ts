import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/teachers
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const teachers = db.users
    .find((u) => u.role === 'teacher')
    .map((u) => {
      const assignedBatches = db.batches.find((b) => b.teacherId === u._id && b.status === 'active');
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        isActive: u.isActive,
        createdAt: u.createdAt,
        assignedBatches: assignedBatches.map((b) => ({
          _id: b._id,
          name: b.name,
          code: b.code,
        })),
      };
    });

  res.json({ teachers });
});

// POST /api/teachers (Admin creates new teacher)
router.post('/', authenticate, authorizeRoles('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.users.findOne((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      res.status(400).json({ error: `User with email "${cleanEmail}" already exists.` });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const now = new Date().toISOString();

    const newTeacher = db.users.insert({
      _id: `usr_tch_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'teacher',
      phone: phone ? phone.trim() : undefined,
      avatar: '/src/assets/images/avatar_teacher_lead_1791807069605.jpg',
      isActive: true,
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });

    db.auditLogs.insert({
      _id: `log_${Date.now()}`,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'CREATE_TEACHER',
      targetType: 'User',
      targetId: newTeacher._id,
      details: `Created new teacher account for ${newTeacher.name} (${newTeacher.email}).`,
      timestamp: now,
    });

    res.status(201).json({
      message: 'Teacher account created successfully.',
      teacher: {
        _id: newTeacher._id,
        name: newTeacher.name,
        email: newTeacher.email,
        phone: newTeacher.phone,
        isActive: newTeacher.isActive,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create teacher: ' + err.message });
  }
});

// PATCH /api/teachers/:id
router.patch('/:id', authenticate, authorizeRoles('admin'), (req: AuthRequest, res: Response) => {
  try {
    const teacher = db.users.findById(req.params.id);
    if (!teacher || teacher.role !== 'teacher') {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }

    const { name, phone, isActive } = req.body;
    const updated = db.users.update(teacher._id, {
      name: name?.trim() ?? teacher.name,
      phone: phone?.trim() ?? teacher.phone,
      isActive: isActive !== undefined ? !!isActive : teacher.isActive,
    });

    res.json({
      message: 'Teacher updated successfully.',
      teacher: {
        _id: updated!._id,
        name: updated!.name,
        email: updated!.email,
        phone: updated!.phone,
        isActive: updated!.isActive,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update teacher: ' + err.message });
  }
});

export default router;
