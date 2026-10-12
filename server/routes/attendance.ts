import { Router, Response } from 'express';
import { db, AttendanceRecordDoc } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/attendance/sessions
router.get('/sessions', authenticate, (req: AuthRequest, res: Response) => {
  const { batchId, date, startDate, endDate } = req.query;

  let sessions = db.attendanceSessions.find();

  // If teacher, only allowed to see batches assigned to them unless query specific
  if (req.user?.role === 'teacher') {
    const teacherBatches = db.batches.find((b) => b.teacherId === req.user?._id).map((b) => b._id);
    sessions = sessions.filter((s) => teacherBatches.includes(s.batchId));
  }

  if (batchId) {
    sessions = sessions.filter((s) => s.batchId === batchId);
  }

  if (date) {
    sessions = sessions.filter((s) => s.date === date);
  }

  if (startDate) {
    sessions = sessions.filter((s) => s.date >= String(startDate));
  }

  if (endDate) {
    sessions = sessions.filter((s) => s.date <= String(endDate));
  }

  // Enrich with batch details and stats
  const enriched = sessions.map((ses) => {
    const batch = db.batches.findById(ses.batchId);
    const creator = db.users.findById(ses.createdBy);
    const records = db.attendanceRecords.find((r) => r.sessionId === ses._id);

    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const excused = records.filter((r) => r.status === 'excused').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return {
      ...ses,
      batchName: batch?.name || 'Batch',
      batchCode: batch?.code || '',
      creatorName: creator?.name || 'Faculty',
      stats: {
        total,
        present,
        absent,
        late,
        excused,
        rate,
      },
    };
  });

  // Sort by date descending
  enriched.sort((a, b) => b.date.localeCompare(a.date));

  res.json({ sessions: enriched });
});

// POST /api/attendance/sessions (Create or find existing session for batch and date)
router.post('/sessions', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { batchId, date, sessionTitle } = req.body;
    if (!batchId || !date) {
      res.status(400).json({ error: 'Batch ID and session date (YYYY-MM-DD) are required.' });
      return;
    }

    const batch = db.batches.findById(batchId);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found.' });
      return;
    }

    // Role check: Admin or the teacher assigned to this batch
    if (req.user?.role === 'teacher' && batch.teacherId !== req.user._id) {
      res.status(403).json({ error: 'Permission denied: You are not authorized to mark attendance for this batch.' });
      return;
    }

    // Check duplicate session for batch & date
    let session = db.attendanceSessions.findOne((s) => s.batchId === batchId && s.date === date);

    if (session) {
      // Reopening existing session: return session directly
      res.json({
        message: 'Loaded existing session for this date.',
        session,
        isExisting: true,
      });
      return;
    }

    const now = new Date().toISOString();
    const newSession = db.attendanceSessions.insert({
      _id: `ses_${batch.code.toLowerCase()}_${date}`,
      batchId,
      date,
      sessionTitle: sessionTitle ? sessionTitle.trim() : `${batch.name} - ${date}`,
      createdBy: req.user!._id,
      finalized: false,
      createdAt: now,
      updatedAt: now,
    });

    db.auditLogs.insert({
      _id: `log_${Date.now()}`,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'OPEN_SESSION',
      targetType: 'AttendanceSession',
      targetId: newSession._id,
      details: `Opened attendance session for ${batch.name} on ${date}.`,
      timestamp: now,
    });

    res.status(201).json({
      message: 'New attendance session created.',
      session: newSession,
      isExisting: false,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create session: ' + err.message });
  }
});

// GET /api/attendance/sessions/:id
router.get('/sessions/:id', authenticate, (req: AuthRequest, res: Response) => {
  const session = db.attendanceSessions.findById(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Attendance session not found.' });
    return;
  }

  const batch = db.batches.findById(session.batchId);
  if (!batch) {
    res.status(404).json({ error: 'Associated batch not found.' });
    return;
  }

  // Teacher check
  if (req.user?.role === 'teacher' && batch.teacherId !== req.user._id) {
    res.status(403).json({ error: 'Access denied: You are not authorized to view this batch session.' });
    return;
  }

  // Get all active students enrolled in this batch
  const enrolledStudents = db.students
    .find((s) => s.batchId === batch._id && s.status === 'active')
    .sort((a, b) => a.studentId.localeCompare(b.studentId));

  // Get existing attendance records for this session
  const records = db.attendanceRecords.find((r) => r.sessionId === session._id);
  const recordsMap = new Map<string, AttendanceRecordDoc>();
  for (const r of records) {
    recordsMap.set(r.studentId, r);
  }

  // Map student rows with their saved record if any
  const studentRows = enrolledStudents.map((st) => {
    const existingRec = recordsMap.get(st._id);
    return {
      studentId: st._id,
      studentCode: st.studentId,
      fullName: st.fullName,
      phone: st.phone,
      parentPhone: st.parentPhone,
      recordId: existingRec?._id || null,
      status: existingRec?.status || null, // null if unsaved
      notes: existingRec?.notes || '',
      lastModified: existingRec?.updatedAt || null,
    };
  });

  res.json({
    session,
    batch: {
      _id: batch._id,
      name: batch.name,
      code: batch.code,
      teacherId: batch.teacherId,
    },
    students: studentRows,
  });
});

// PUT /api/attendance/sessions/:id/records (Bulk save/update attendance)
router.put('/sessions/:id/records', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const session = db.attendanceSessions.findById(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    const batch = db.batches.findById(session.batchId);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found.' });
      return;
    }

    if (req.user?.role === 'teacher' && batch.teacherId !== req.user._id) {
      res.status(403).json({ error: 'Unauthorized to mark attendance for this batch.' });
      return;
    }

    const { records: studentRecords, sessionTitle } = req.body;
    if (!Array.isArray(studentRecords) || studentRecords.length === 0) {
      res.status(400).json({ error: 'Please provide attendance records array.' });
      return;
    }

    const now = new Date().toISOString();
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    for (const item of studentRecords) {
      const { studentId, status, notes } = item;
      if (!studentId || !['present', 'absent', 'late', 'excused'].includes(status)) {
        continue;
      }

      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'excused') excusedCount++;

      // Enforce unique record per student per session
      const existing = db.attendanceRecords.findOne(
        (r) => r.sessionId === session._id && r.studentId === studentId
      );

      if (existing) {
        db.attendanceRecords.update(existing._id, {
          status,
          notes: notes !== undefined ? notes : existing.notes,
          lastModifiedBy: req.user!._id,
        });
      } else {
        db.attendanceRecords.insert({
          _id: `rec_${session._id}_${studentId}`,
          sessionId: session._id,
          batchId: session.batchId,
          studentId,
          status,
          notes: notes || undefined,
          markedBy: req.user!._id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Mark session as finalized and update title if provided
    db.attendanceSessions.update(session._id, {
      finalized: true,
      sessionTitle: sessionTitle ? sessionTitle.trim() : session.sessionTitle,
    });

    // Create Audit Log
    db.auditLogs.insert({
      _id: `log_${Date.now()}`,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'SUBMIT_ATTENDANCE',
      targetType: 'AttendanceSession',
      targetId: session._id,
      details: `Saved attendance for ${batch.name} (${session.date}): ${presentCount} Present, ${absentCount} Absent, ${lateCount} Late, ${excusedCount} Excused.`,
      timestamp: now,
    });

    res.json({
      message: 'Attendance saved successfully.',
      summary: {
        total: studentRecords.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save attendance: ' + err.message });
  }
});

// PATCH /api/attendance/records/:id (Individual record correction with audit trail)
router.patch('/records/:id', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const record = db.attendanceRecords.findById(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Attendance record not found.' });
      return;
    }

    const session = db.attendanceSessions.findById(record.sessionId);
    const batch = db.batches.findById(record.batchId);

    if (req.user?.role === 'teacher' && batch && batch.teacherId !== req.user._id) {
      res.status(403).json({ error: 'Unauthorized to edit records for this batch.' });
      return;
    }

    const { status, notes, reason } = req.body;
    if (!status || !['present', 'absent', 'late', 'excused'].includes(status)) {
      res.status(400).json({ error: 'Valid status is required.' });
      return;
    }

    const prevStatus = record.status;
    const student = db.students.findById(record.studentId);
    const now = new Date().toISOString();

    const updated = db.attendanceRecords.update(record._id, {
      status,
      notes: notes !== undefined ? notes : record.notes,
      lastModifiedBy: req.user!._id,
    });

    // Mandatory Audit trail for correction
    db.auditLogs.insert({
      _id: `log_${Date.now()}`,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'CORRECT_RECORD',
      targetType: 'AttendanceRecord',
      targetId: record._id,
      details: `Changed attendance of ${student?.fullName || record.studentId} on ${session?.date || 'session'} from '${prevStatus}' to '${status}'. Reason: ${reason || 'Teacher/Admin manual correction'}.`,
      timestamp: now,
    });

    res.json({
      message: 'Attendance record updated successfully with audit trail.',
      record: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update record: ' + err.message });
  }
});

export default router;
