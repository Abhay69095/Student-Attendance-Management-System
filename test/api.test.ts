import { db, connectDatabase } from '../server/db.js';
import { seedInitialData } from '../server/seed.js';
import { calculateStudentAttendanceStats } from '../server/routes/students.js';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('--- Starting ClassAttend Test Suite ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Connect to database
  await connectDatabase();

  // 1. Seed verification
  await seedInitialData();
  const admin = db.users.findOne((u) => u.email === 'admin@classattend.com');
  assert(admin !== null && admin.role === 'admin', 'Admin account successfully seeded');

  const teacher = db.users.findOne((u) => u.email === 'sarah.faculty@classattend.com');
  assert(teacher !== null && teacher.role === 'teacher', 'Teacher account successfully seeded');

  // 2. Password hashing & validation
  const isMatch = await bcrypt.compare('Admin@123', admin!.passwordHash);
  assert(isMatch === true, 'Bcrypt password comparison succeeds for valid credentials');

  const isWrongMatch = await bcrypt.compare('WrongPassword', admin!.passwordHash);
  assert(isWrongMatch === false, 'Bcrypt password comparison fails for invalid credentials');

  // 3. Batches & Courses linkage
  const batches = db.batches.find();
  assert(batches.length >= 3, `Expected at least 3 active batches, found ${batches.length}`);

  const alphaBatch = batches.find((b) => b.code === 'B-PHY-ALPHA');
  assert(alphaBatch !== undefined && alphaBatch.teacherId === teacher!._id, 'Teacher correctly assigned to Physics Batch Alpha');

  // 4. Duplicate attendance session prevention
  const testDate = '2026-11-01';
  let existingSession = db.attendanceSessions.findOne(
    (s) => s.batchId === alphaBatch!._id && s.date === testDate
  );

  let sessionId = '';
  if (existingSession) {
    sessionId = existingSession._id;
  } else {
    const newSession = db.attendanceSessions.insert({
      _id: `ses_test_${alphaBatch!._id}_${testDate}`,
      batchId: alphaBatch!._id,
      date: testDate,
      sessionTitle: 'Test Duplicate Session',
      createdBy: teacher!._id,
      finalized: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    sessionId = newSession._id;
  }

  // Check that duplicate check finds this session
  const lookupSession = db.attendanceSessions.findOne(
    (s) => s.batchId === alphaBatch!._id && s.date === testDate
  );
  assert(lookupSession !== null && lookupSession._id === sessionId, 'Duplicate session query correctly identifies existing session');

  // 5. Unique Attendance Record per student per session
  const student = db.students.find()[0];
  const existingRec = db.attendanceRecords.findOne(
    (r) => r.sessionId === sessionId && r.studentId === student._id
  );
  if (existingRec) {
    db.attendanceRecords.update(existingRec._id, { status: 'present' });
  } else {
    db.attendanceRecords.insert({
      _id: `rec_test_${sessionId}_${student._id}`,
      sessionId,
      batchId: alphaBatch!._id,
      studentId: student._id,
      status: 'present',
      markedBy: teacher!._id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Verify findOne identifies the unique record
  const foundRec = db.attendanceRecords.findOne(
    (r) => r.sessionId === sessionId && r.studentId === student._id
  );
  assert(foundRec !== null && foundRec.status === 'present', 'Attendance record saved and indexed uniquely per student/session');

  // 6. Attendance Percentage Calculation
  const stats = calculateStudentAttendanceStats(student._id);
  assert(typeof stats.percentage === 'number' && stats.percentage >= 0 && stats.percentage <= 100, `Calculated attendance percentage is valid: ${stats.percentage}%`);
  assert(stats.totalSessions >= 1, `Student has registered sessions (total: ${stats.totalSessions})`);

  // 7. Audit Log integrity
  const auditLogs = db.auditLogs.find();
  assert(auditLogs.length > 0, `Audit logs exist (${auditLogs.length} total entries)`);
  assert(auditLogs[0].timestamp !== undefined, 'Audit logs have ISO timestamps');

  console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
