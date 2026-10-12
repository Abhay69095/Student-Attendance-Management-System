import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ================= Courses =================
router.get('/courses', authenticate, (req: AuthRequest, res: Response) => {
  const courses = db.courses.find().map((c) => {
    const batchCount = db.batches.count((b) => b.courseId === c._id && b.status === 'active');
    const studentCount = db.students.count((s) => s.courseId === c._id && s.status === 'active');
    return {
      ...c,
      batchCount,
      studentCount,
    };
  });
  res.json({ courses });
});

router.post('/courses', authenticate, authorizeRoles('admin'), (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'Course name and course code are required.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = db.courses.findOne((c) => c.code.toUpperCase() === cleanCode);
    if (existing) {
      res.status(400).json({ error: `Course with code "${cleanCode}" already exists.` });
      return;
    }

    const now = new Date().toISOString();
    const newCourse = db.courses.insert({
      _id: `crs_${Date.now()}`,
      name: name.trim(),
      code: cleanCode,
      description: description ? description.trim() : undefined,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    db.auditLogs.insert({
      _id: `log_${Date.now()}`,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'CREATE_COURSE',
      targetType: 'Course',
      targetId: newCourse._id,
      details: `Created new course: ${newCourse.name} (${newCourse.code}).`,
      timestamp: now,
    });

    res.status(201).json({ message: 'Course created successfully.', course: newCourse });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create course: ' + err.message });
  }
});

// ================= Batches =================
// GET /api/batches
router.get('/batches', authenticate, (req: AuthRequest, res: Response) => {
  let list = db.batches.find();

  // If teacher and query ?myBatches=true, filter to assigned
  if (req.user?.role === 'teacher' && req.query.myBatches === 'true') {
    list = list.filter((b) => b.teacherId === req.user?._id);
  }

  const enriched = list.map((b) => {
    const course = db.courses.findById(b.courseId);
    const teacher = db.users.findById(b.teacherId);
    const studentCount = db.students.count((s) => s.batchId === b._id && s.status === 'active');
    const sessionCount = db.attendanceSessions.count((s) => s.batchId === b._id);
    return {
      ...b,
      courseName: course?.name || 'Unassigned Course',
      courseCode: course?.code || '',
      teacherName: teacher?.name || 'Unassigned Teacher',
      teacherEmail: teacher?.email || '',
      studentCount,
      sessionCount,
    };
  });

  res.json({ batches: enriched });
});

// GET /api/batches/:id
router.get('/batches/:id', authenticate, (req: AuthRequest, res: Response) => {
  const batch = db.batches.findById(req.params.id);
  if (!batch) {
    res.status(404).json({ error: 'Batch not found.' });
    return;
  }

  const course = db.courses.findById(batch.courseId);
  const teacher = db.users.findById(batch.teacherId);
  const enrolledStudents = db.students
    .find((s) => s.batchId === batch._id && s.status === 'active')
    .map((s) => ({
      _id: s._id,
      studentId: s.studentId,
      fullName: s.fullName,
      phone: s.phone,
      email: s.email,
    }));

  res.json({
    batch: {
      ...batch,
      courseName: course?.name || '',
      teacherName: teacher?.name || 'Unassigned',
      teacherEmail: teacher?.email || '',
      students: enrolledStudents,
      studentCount: enrolledStudents.length,
    },
  });
});

// GET /api/batches/:id/students
router.get('/batches/:id/students', authenticate, (req: AuthRequest, res: Response) => {
  const batch = db.batches.findById(req.params.id);
  if (!batch) {
    res.status(404).json({ error: 'Batch not found.' });
    return;
  }

  // Teacher authorization check: can only view their own batch unless admin
  if (req.user?.role === 'teacher' && batch.teacherId !== req.user._id) {
    res.status(403).json({ error: 'Access denied: You are not the assigned teacher for this batch.' });
    return;
  }

  const students = db.students
    .find((s) => s.batchId === batch._id && s.status === 'active')
    .map((s) => ({
      _id: s._id,
      studentId: s.studentId,
      fullName: s.fullName,
      phone: s.phone,
      email: s.email,
      parentPhone: s.parentPhone,
      status: s.status,
    }))
    .sort((a, b) => a.studentId.localeCompare(b.studentId));

  res.json({ students });
});

// POST /api/batches
router.post('/batches', authenticate, authorizeRoles('admin'), (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      code,
      courseId,
      teacherId,
      startDate,
      endDate,
      classDays,
      startTime,
      endTime,
      room,
    } = req.body;

    if (!name || !code || !courseId || !teacherId || !startTime || !endTime) {
      res.status(400).json({ error: 'Batch name, code, course, teacher, and schedule times are required.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = db.batches.findOne((b) => b.code.toUpperCase() === cleanCode);
    if (existing) {
      res.status(400).json({ error: `Batch with code "${cleanCode}" already exists.` });
      return;
    }

    const teacher = db.users.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      res.status(400).json({ error: 'Assigned user must be a valid faculty/teacher.' });
      return;
    }

    const course = db.courses.findById(courseId);
    if (!course) {
      res.status(400).json({ error: 'Selected course does not exist.' });
      return;
    }

    const now = new Date().toISOString();
    const newBatch = db.batches.insert({
      _id: `btc_${Date.now()}`,
      name: name.trim(),
      code: cleanCode,
      courseId,
      teacherId,
      startDate: startDate || now.split('T')[0],
      endDate: endDate || '2026-12-31',
      classDays: Array.isArray(classDays) && classDays.length > 0 ? classDays : ['Mon', 'Wed', 'Fri'],
      startTime,
      endTime,
      room: room ? room.trim() : undefined,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    db.auditLogs.insert({
      _id: `log_${Date.now()}`,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'CREATE_BATCH',
      targetType: 'Batch',
      targetId: newBatch._id,
      details: `Created batch: ${newBatch.name} (${newBatch.code}) assigned to ${teacher.name}.`,
      timestamp: now,
    });

    res.status(201).json({ message: 'Batch created successfully.', batch: newBatch });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create batch: ' + err.message });
  }
});

// PATCH /api/batches/:id
router.patch('/batches/:id', authenticate, authorizeRoles('admin'), (req: AuthRequest, res: Response) => {
  try {
    const batch = db.batches.findById(req.params.id);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found.' });
      return;
    }

    const {
      name,
      courseId,
      teacherId,
      startDate,
      endDate,
      classDays,
      startTime,
      endTime,
      room,
      status,
    } = req.body;

    const oldTeacherId = batch.teacherId;

    const updated = db.batches.update(batch._id, {
      name: name?.trim() ?? batch.name,
      courseId: courseId ?? batch.courseId,
      teacherId: teacherId ?? batch.teacherId,
      startDate: startDate ?? batch.startDate,
      endDate: endDate ?? batch.endDate,
      classDays: classDays ?? batch.classDays,
      startTime: startTime ?? batch.startTime,
      endTime: endTime ?? batch.endTime,
      room: room?.trim() ?? batch.room,
      status: status ?? batch.status,
    });

    db.auditLogs.insert({
      _id: `log_${Date.now()}`,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'UPDATE_BATCH',
      targetType: 'Batch',
      targetId: batch._id,
      details: `Updated batch ${batch.name}. Faculty reassigned: ${oldTeacherId !== teacherId}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Batch updated successfully.', batch: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update batch: ' + err.message });
  }
});

export default router;
