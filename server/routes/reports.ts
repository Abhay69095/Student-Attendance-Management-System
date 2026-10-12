import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { calculateStudentAttendanceStats } from './students.js';

const router = Router();

// GET /api/attendance/reports/summary (Core Module 2: Dashboard Overview)
router.get('/summary', authenticate, (req: AuthRequest, res: Response) => {
  const isTeacher = req.user?.role === 'teacher';
  const teacherId = req.user?._id;

  // Filter batches if teacher
  const allBatches = db.batches.find((b) => b.status === 'active');
  const relevantBatches = isTeacher
    ? allBatches.filter((b) => b.teacherId === teacherId)
    : allBatches;
  const relevantBatchIds = relevantBatches.map((b) => b._id);

  // Active students
  const activeStudents = db.students.find((s) => {
    if (s.status !== 'active') return false;
    return isTeacher ? relevantBatchIds.includes(s.batchId) : true;
  });

  const totalTeachers = db.users.count((u) => u.role === 'teacher' && u.isActive);

  // Today's stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = db.attendanceSessions.find(
    (s) => s.date === todayStr && relevantBatchIds.includes(s.batchId)
  );
  const todaySessionIds = todaySessions.map((s) => s._id);

  const todayRecords = db.attendanceRecords.find((r) => todaySessionIds.includes(r.sessionId));
  const todayPresent = todayRecords.filter((r) => r.status === 'present').length;
  const todayAbsent = todayRecords.filter((r) => r.status === 'absent').length;
  const todayLate = todayRecords.filter((r) => r.status === 'late').length;
  const todayExcused = todayRecords.filter((r) => r.status === 'excused').length;
  const todayTotal = todayRecords.length;

  const settings = db.settings.findById('settings_default');
  const lowThreshold = settings?.lowAttendanceThreshold ?? 75;

  const todayEligible = settings?.excludeExcusedFromDenominator
    ? todayTotal - todayExcused
    : todayTotal;
  const todayPercentage = todayEligible > 0
    ? Math.round(((todayPresent + todayLate * (settings?.lateAttendanceWeight ?? 1)) / todayEligible) * 100 * 10) / 10
    : 0;

  // 14-day trend data
  const trendDays: Array<{
    date: string;
    dayLabel: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    rate: number;
  }> = [];

  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

    const daySessions = db.attendanceSessions.find(
      (s) => s.date === dateStr && relevantBatchIds.includes(s.batchId)
    );
    const daySessionIds = daySessions.map((s) => s._id);
    const dayRecords = db.attendanceRecords.find((r) => daySessionIds.includes(r.sessionId));

    const p = dayRecords.filter((r) => r.status === 'present').length;
    const a = dayRecords.filter((r) => r.status === 'absent').length;
    const l = dayRecords.filter((r) => r.status === 'late').length;
    const e = dayRecords.filter((r) => r.status === 'excused').length;
    const tot = dayRecords.length;
    const elig = settings?.excludeExcusedFromDenominator ? tot - e : tot;
    const rate = elig > 0 ? Math.round(((p + l) / elig) * 100) : 0;

    trendDays.push({
      date: dateStr,
      dayLabel,
      present: p,
      absent: a,
      late: l,
      excused: e,
      total: tot,
      rate,
    });
  }

  // Batch-wise comparison
  const batchComparison = relevantBatches.map((b) => {
    const studentsInBatch = db.students.find((s) => s.batchId === b._id && s.status === 'active');
    const bSessions = db.attendanceSessions.find((s) => s.batchId === b._id);
    const bSessionIds = bSessions.map((s) => s._id);
    const bRecords = db.attendanceRecords.find((r) => bSessionIds.includes(r.sessionId));

    const p = bRecords.filter((r) => r.status === 'present').length;
    const l = bRecords.filter((r) => r.status === 'late').length;
    const e = bRecords.filter((r) => r.status === 'excused').length;
    const tot = bRecords.length;
    const elig = settings?.excludeExcusedFromDenominator ? tot - e : tot;
    const avgRate = elig > 0 ? Math.round(((p + l) / elig) * 100) : 100;

    return {
      batchId: b._id,
      batchName: b.name,
      batchCode: b.code,
      studentCount: studentsInBatch.length,
      sessionCount: bSessions.length,
      attendanceRate: avgRate,
    };
  });

  // Students with low attendance (< threshold)
  const lowAttendanceStudents = activeStudents
    .map((s) => {
      const stats = calculateStudentAttendanceStats(s._id);
      const batch = db.batches.findById(s.batchId);
      return {
        _id: s._id,
        studentId: s.studentId,
        fullName: s.fullName,
        phone: s.phone,
        parentPhone: s.parentPhone,
        batchName: batch?.name || 'Batch',
        stats,
      };
    })
    .filter((s) => s.stats.totalSessions > 0 && s.stats.percentage < lowThreshold)
    .sort((a, b) => a.stats.percentage - b.stats.percentage);

  // Recent attendance activity
  const recentLogs = db.auditLogs
    .find()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8);

  res.json({
    summary: {
      totalStudents: activeStudents.length,
      totalTeachers: isTeacher ? 1 : totalTeachers,
      totalBatches: relevantBatches.length,
      today: {
        total: todayTotal,
        present: todayPresent,
        absent: todayAbsent,
        late: todayLate,
        excused: todayExcused,
        percentage: todayPercentage,
      },
      lowAttendanceCount: lowAttendanceStudents.length,
      threshold: lowThreshold,
    },
    trend: trendDays,
    batchComparison,
    lowAttendanceStudents,
    recentActivity: recentLogs,
  });
});

// GET /api/attendance/reports/student/:studentId
router.get('/student/:studentId', authenticate, (req: AuthRequest, res: Response) => {
  const student = db.students.findById(req.params.studentId);
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }

  // Student portal permission check: students can only see their own attendance
  if (req.user?.role === 'student') {
    const studentUser = db.users.findById(req.user._id);
    if (studentUser?.studentId !== student.studentId) {
      res.status(403).json({ error: 'Forbidden: Students can only view their own attendance portal.' });
      return;
    }
  }

  const batch = db.batches.findById(student.batchId);
  const course = db.courses.findById(student.courseId);
  const stats = calculateStudentAttendanceStats(student._id);

  // Date-wise records
  const records = db.attendanceRecords
    .find((r) => r.studentId === student._id)
    .map((r) => {
      const session = db.attendanceSessions.findById(r.sessionId);
      const marker = db.users.findById(r.markedBy);
      return {
        ...r,
        date: session?.date || '',
        sessionTitle: session?.sessionTitle || '',
        markedByName: marker?.name || 'Faculty',
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // Monthly breakdown
  const monthMap: Record<string, { present: number; absent: number; late: number; excused: number; total: number }> = {};
  for (const r of records) {
    if (!r.date) continue;
    const monthKey = r.date.substring(0, 7); // YYYY-MM
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    }
    monthMap[monthKey].total++;
    if (r.status === 'present') monthMap[monthKey].present++;
    else if (r.status === 'absent') monthMap[monthKey].absent++;
    else if (r.status === 'late') monthMap[monthKey].late++;
    else if (r.status === 'excused') monthMap[monthKey].excused++;
  }

  const monthlyBreakdown = Object.entries(monthMap)
    .map(([month, mStats]) => {
      const rate = mStats.total > 0 ? Math.round(((mStats.present + mStats.late) / mStats.total) * 100) : 0;
      return {
        month,
        ...mStats,
        rate,
      };
    })
    .sort((a, b) => b.month.localeCompare(a.month));

  res.json({
    student: {
      _id: student._id,
      studentId: student.studentId,
      fullName: student.fullName,
      phone: student.phone,
      email: student.email,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      batchName: batch?.name || '',
      courseName: course?.name || '',
      admissionDate: student.admissionDate,
    },
    stats,
    monthlyBreakdown,
    history: records,
  });
});

// GET /api/attendance/reports/batch/:batchId
router.get('/batch/:batchId', authenticate, (req: AuthRequest, res: Response) => {
  const { batchId } = req.params;
  const { startDate, endDate } = req.query;

  const batch = db.batches.findById(batchId);
  if (!batch) {
    res.status(404).json({ error: 'Batch not found.' });
    return;
  }

  // Teacher check
  if (req.user?.role === 'teacher' && batch.teacherId !== req.user._id) {
    res.status(403).json({ error: 'Unauthorized to view reports for this batch.' });
    return;
  }

  let sessions = db.attendanceSessions.find((s) => s.batchId === batch._id);
  if (startDate) sessions = sessions.filter((s) => s.date >= String(startDate));
  if (endDate) sessions = sessions.filter((s) => s.date <= String(endDate));
  sessions.sort((a, b) => b.date.localeCompare(a.date));

  const sessionIds = sessions.map((s) => s._id);
  const students = db.students.find((s) => s.batchId === batch._id && s.status === 'active');

  const settings = db.settings.findById('settings_default');
  const lowThreshold = settings?.lowAttendanceThreshold ?? 75;

  // Student performance within this batch
  const studentReports = students.map((st) => {
    const records = db.attendanceRecords.find(
      (r) => r.studentId === st._id && sessionIds.includes(r.sessionId)
    );
    const tot = records.length;
    const p = records.filter((r) => r.status === 'present').length;
    const a = records.filter((r) => r.status === 'absent').length;
    const l = records.filter((r) => r.status === 'late').length;
    const e = records.filter((r) => r.status === 'excused').length;
    const elig = settings?.excludeExcusedFromDenominator ? tot - e : tot;
    const rate = elig > 0 ? Math.round(((p + l) / elig) * 100 * 10) / 10 : 100;

    return {
      _id: st._id,
      studentId: st.studentId,
      fullName: st.fullName,
      phone: st.phone,
      parentPhone: st.parentPhone,
      totalSessions: tot,
      present: p,
      absent: a,
      late: l,
      excused: e,
      percentage: rate,
      isLowAttendance: rate < lowThreshold && tot > 0,
    };
  });

  studentReports.sort((a, b) => a.percentage - b.percentage);

  // Overall batch metrics
  const totalRecords = db.attendanceRecords.find((r) => sessionIds.includes(r.sessionId));
  const batchPresent = totalRecords.filter((r) => r.status === 'present').length;
  const batchAbsent = totalRecords.filter((r) => r.status === 'absent').length;
  const batchLate = totalRecords.filter((r) => r.status === 'late').length;
  const batchExcused = totalRecords.filter((r) => r.status === 'excused').length;
  const batchEligible = settings?.excludeExcusedFromDenominator
    ? totalRecords.length - batchExcused
    : totalRecords.length;
  const overallPercentage = batchEligible > 0
    ? Math.round(((batchPresent + batchLate) / batchEligible) * 100 * 10) / 10
    : 100;

  res.json({
    batch: {
      _id: batch._id,
      name: batch.name,
      code: batch.code,
      totalStudents: students.length,
      totalSessions: sessions.length,
      overallPercentage,
    },
    students: studentReports,
    sessions: sessions.map((s) => ({
      _id: s._id,
      date: s.date,
      title: s.sessionTitle,
    })),
  });
});

// GET /api/attendance/reports/export/csv
router.get('/export/csv', authenticate, (req: AuthRequest, res: Response) => {
  const { batchId, startDate, endDate } = req.query;

  let sessions = db.attendanceSessions.find();
  if (batchId) sessions = sessions.filter((s) => s.batchId === batchId);
  if (startDate) sessions = sessions.filter((s) => s.date >= String(startDate));
  if (endDate) sessions = sessions.filter((s) => s.date <= String(endDate));

  const sessionIds = sessions.map((s) => s._id);
  const records = db.attendanceRecords.find((r) => sessionIds.includes(r.sessionId));

  const headers = [
    'Date',
    'Batch Code',
    'Batch Name',
    'Student ID',
    'Student Name',
    'Attendance Status',
    'Notes',
    'Marked By',
  ];

  const rows = records.map((r) => {
    const session = db.attendanceSessions.findById(r.sessionId);
    const batch = db.batches.findById(r.batchId);
    const student = db.students.findById(r.studentId);
    const marker = db.users.findById(r.markedBy);

    return [
      `"${session?.date || ''}"`,
      `"${batch?.code || ''}"`,
      `"${batch?.name || ''}"`,
      `"${student?.studentId || ''}"`,
      `"${student?.fullName || ''}"`,
      `"${r.status.toUpperCase()}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      `"${marker?.name || ''}"`,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${Date.now()}.csv"`);
  res.send(csv);
});

export default router;
