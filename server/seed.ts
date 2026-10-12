import bcrypt from 'bcryptjs';
import { db } from './db.js';

export async function seedInitialData() {
  // Check if users already seeded
  if (db.users.count() > 0) {
    return;
  }

  console.log('Seeding initial educational database...');

  const now = new Date().toISOString();
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', salt);
  const teacherPasswordHash = await bcrypt.hash('Teacher@123', salt);
  const studentPasswordHash = await bcrypt.hash('Student@123', salt);

  // 1. Settings
  db.settings.insert({
    _id: 'settings_default',
    instituteName: 'Apex Academy of Sciences',
    lowAttendanceThreshold: 75,
    lateAttendanceWeight: 1.0,
    excludeExcusedFromDenominator: true,
    academicYear: '2026-2027',
    updatedAt: now,
  });

  // 2. Users
  const admin = db.users.insert({
    _id: 'usr_admin_1',
    name: 'Dr. Eleanor Vance',
    email: 'admin@classattend.com',
    passwordHash: adminPasswordHash,
    role: 'admin',
    phone: '+1 (555) 234-5678',
    avatar: '/src/assets/images/avatar_admin_director_1791807056462.jpg',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const teacher1 = db.users.insert({
    _id: 'usr_teacher_1',
    name: 'Prof. Sarah Jenkins',
    email: 'sarah.faculty@classattend.com',
    passwordHash: teacherPasswordHash,
    role: 'teacher',
    phone: '+1 (555) 345-6789',
    avatar: '/src/assets/images/avatar_teacher_lead_1791807069605.jpg',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const teacher2 = db.users.insert({
    _id: 'usr_teacher_2',
    name: 'Dr. David Miller',
    email: 'david.faculty@classattend.com',
    passwordHash: teacherPasswordHash,
    role: 'teacher',
    phone: '+1 (555) 456-7890',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const studentUser = db.users.insert({
    _id: 'usr_student_1',
    name: 'Rahul Sharma',
    email: 'rahul.student@classattend.com',
    passwordHash: studentPasswordHash,
    role: 'student',
    phone: '+1 (555) 890-1234',
    studentId: 'STU-2026-001',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Courses
  const coursePhysics = db.courses.insert({
    _id: 'crs_phy_101',
    name: 'Advanced Classical & Modern Physics',
    code: 'PHY-101',
    description: 'Mechanics, Electromagnetism, Quantum Foundations, and Laboratory Practicals.',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  const courseMath = db.courses.insert({
    _id: 'crs_math_201',
    name: 'Competitive Calculus & Linear Algebra',
    code: 'MATH-201',
    description: 'Rigorous multivariable calculus, proofs, series, and linear systems.',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  const courseChem = db.courses.insert({
    _id: 'crs_chem_301',
    name: 'Organic Chemistry Foundations',
    code: 'CHEM-301',
    description: 'Reaction mechanisms, stereochemistry, spectroscopic analysis.',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  // 4. Batches
  const batchAlpha = db.batches.insert({
    _id: 'btc_alpha_01',
    name: 'Batch Alpha - Advanced Physics',
    code: 'B-PHY-ALPHA',
    courseId: coursePhysics._id,
    teacherId: teacher1._id,
    startDate: '2026-01-10',
    endDate: '2026-12-15',
    classDays: ['Mon', 'Wed', 'Fri'],
    startTime: '09:00',
    endTime: '10:30',
    room: 'Lecture Hall 204',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  const batchBeta = db.batches.insert({
    _id: 'btc_beta_02',
    name: 'Batch Beta - Calculus Champions',
    code: 'B-MTH-BETA',
    courseId: courseMath._id,
    teacherId: teacher2._id,
    startDate: '2026-01-15',
    endDate: '2026-12-20',
    classDays: ['Tue', 'Thu', 'Sat'],
    startTime: '11:00',
    endTime: '12:30',
    room: 'Room 102',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  const batchGamma = db.batches.insert({
    _id: 'btc_gamma_03',
    name: 'Batch Gamma - Organic Lab',
    code: 'B-CHM-GAMMA',
    courseId: courseChem._id,
    teacherId: teacher1._id,
    startDate: '2026-02-01',
    endDate: '2026-11-30',
    classDays: ['Mon', 'Wed'],
    startTime: '14:00',
    endTime: '16:00',
    room: 'Chemistry Lab 1',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  // 5. Students
  const rawStudents = [
    {
      id: 'stu_1',
      studentId: 'STU-2026-001',
      fullName: 'Rahul Sharma',
      gender: 'Male' as const,
      phone: '+1 (555) 890-1234',
      email: 'rahul.student@classattend.com',
      parentName: 'Sanjay Sharma',
      parentPhone: '+1 (555) 890-1235',
      address: '742 Evergreen Terrace, Sector 4',
      admissionDate: '2026-01-05',
      courseId: coursePhysics._id,
      batchId: batchAlpha._id,
      attendanceTendency: 'high', // > 90%
    },
    {
      id: 'stu_2',
      studentId: 'STU-2026-002',
      fullName: 'Priya Patil',
      gender: 'Female' as const,
      phone: '+1 (555) 890-2345',
      email: 'priya.patil@example.com',
      parentName: 'Kavita Patil',
      parentPhone: '+1 (555) 890-2346',
      address: '12 Lotus Enclave, Apt 3B',
      admissionDate: '2026-01-08',
      courseId: coursePhysics._id,
      batchId: batchAlpha._id,
      attendanceTendency: 'high',
    },
    {
      id: 'stu_3',
      studentId: 'STU-2026-003',
      fullName: 'Aman Verma',
      gender: 'Male' as const,
      phone: '+1 (555) 890-3456',
      email: 'aman.verma@example.com',
      parentName: 'Ramesh Verma',
      parentPhone: '+1 (555) 890-3457',
      address: '88 Skyline Heights, Block C',
      admissionDate: '2026-01-10',
      courseId: coursePhysics._id,
      batchId: batchAlpha._id,
      attendanceTendency: 'low', // < 75% for alert showcase
    },
    {
      id: 'stu_4',
      studentId: 'STU-2026-004',
      fullName: 'Ananya Deshmukh',
      gender: 'Female' as const,
      phone: '+1 (555) 890-4567',
      email: 'ananya.d@example.com',
      parentName: 'Sunil Deshmukh',
      parentPhone: '+1 (555) 890-4568',
      address: '24 Orchid Gardens',
      admissionDate: '2026-01-12',
      courseId: coursePhysics._id,
      batchId: batchAlpha._id,
      attendanceTendency: 'medium',
    },
    {
      id: 'stu_5',
      studentId: 'STU-2026-005',
      fullName: 'Rohan Mehta',
      gender: 'Male' as const,
      phone: '+1 (555) 890-5678',
      email: 'rohan.mehta@example.com',
      parentName: 'Rajesh Mehta',
      parentPhone: '+1 (555) 890-5679',
      address: '501 Horizon Towers',
      admissionDate: '2026-01-14',
      courseId: coursePhysics._id,
      batchId: batchAlpha._id,
      attendanceTendency: 'high',
    },
    {
      id: 'stu_6',
      studentId: 'STU-2026-006',
      fullName: 'Sneha Kulkarni',
      gender: 'Female' as const,
      phone: '+1 (555) 890-6789',
      email: 'sneha.k@example.com',
      parentName: 'Anil Kulkarni',
      parentPhone: '+1 (555) 890-6780',
      address: '19 Maple Street',
      admissionDate: '2026-01-15',
      courseId: courseMath._id,
      batchId: batchBeta._id,
      attendanceTendency: 'high',
    },
    {
      id: 'stu_7',
      studentId: 'STU-2026-007',
      fullName: 'Arjun Singhania',
      gender: 'Male' as const,
      phone: '+1 (555) 890-7890',
      email: 'arjun.s@example.com',
      parentName: 'Vikram Singhania',
      parentPhone: '+1 (555) 890-7891',
      address: '33 Emerald Park',
      admissionDate: '2026-01-16',
      courseId: courseMath._id,
      batchId: batchBeta._id,
      attendanceTendency: 'low', // < 75%
    },
    {
      id: 'stu_8',
      studentId: 'STU-2026-008',
      fullName: 'Diya Nair',
      gender: 'Female' as const,
      phone: '+1 (555) 890-8901',
      email: 'diya.nair@example.com',
      parentName: 'Mohan Nair',
      parentPhone: '+1 (555) 890-8902',
      address: '102 Palm Boulevard',
      admissionDate: '2026-01-18',
      courseId: courseMath._id,
      batchId: batchBeta._id,
      attendanceTendency: 'high',
    },
    {
      id: 'stu_9',
      studentId: 'STU-2026-009',
      fullName: 'Karan Malhotra',
      gender: 'Male' as const,
      phone: '+1 (555) 890-9012',
      email: 'karan.m@example.com',
      parentName: 'Alok Malhotra',
      parentPhone: '+1 (555) 890-9013',
      address: '47 Cedar Avenue',
      admissionDate: '2026-01-20',
      courseId: courseChem._id,
      batchId: batchGamma._id,
      attendanceTendency: 'medium',
    },
    {
      id: 'stu_10',
      studentId: 'STU-2026-010',
      fullName: 'Meera Iyer',
      gender: 'Female' as const,
      phone: '+1 (555) 890-0123',
      email: 'meera.iyer@example.com',
      parentName: 'Gopal Iyer',
      parentPhone: '+1 (555) 890-0124',
      address: '15 Jasmine Court',
      admissionDate: '2026-01-22',
      courseId: courseChem._id,
      batchId: batchGamma._id,
      attendanceTendency: 'high',
    },
  ];

  const createdStudents = rawStudents.map((s) => {
    const student = db.students.insert({
      _id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      gender: s.gender,
      phone: s.phone,
      email: s.email,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      address: s.address,
      admissionDate: s.admissionDate,
      courseId: s.courseId,
      batchId: s.batchId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    // Create active enrollment
    db.enrollments.insert({
      _id: `enr_${s.id}_${s.batchId}`,
      studentId: student._id,
      batchId: s.batchId,
      startDate: s.admissionDate,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    return { ...student, attendanceTendency: s.attendanceTendency };
  });

  // 6. Generate Realistic Attendance Sessions and Records for the past 14 days
  // Let's create sessions for dates: past 14 days
  const today = new Date();
  const pastDates: string[] = [];
  for (let i = 14; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Format YYYY-MM-DD
    const isoDate = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0 is Sun
    if (dayOfWeek !== 0) { // skip Sunday
      pastDates.push(isoDate);
    }
  }

  // Create sessions for Batch Alpha
  const alphaStudents = createdStudents.filter((s) => s.batchId === batchAlpha._id);
  const betaStudents = createdStudents.filter((s) => s.batchId === batchBeta._id);

  let sessionCount = 0;
  for (const dateStr of pastDates) {
    sessionCount++;
    const isToday = dateStr === today.toISOString().split('T')[0];
    
    // Batch Alpha Session
    const sessionAlpha = db.attendanceSessions.insert({
      _id: `ses_alpha_${dateStr}`,
      batchId: batchAlpha._id,
      date: dateStr,
      sessionTitle: `Physics Lecture #${sessionCount}`,
      createdBy: teacher1._id,
      finalized: true,
      createdAt: `${dateStr}T09:00:00.000Z`,
      updatedAt: `${dateStr}T10:30:00.000Z`,
    });

    for (const st of alphaStudents) {
      let status: 'present' | 'absent' | 'late' | 'excused' = 'present';
      let notes = '';

      if (st.attendanceTendency === 'low') {
        // frequently absent
        const rand = (sessionCount + st.fullName.length) % 5;
        if (rand === 0 || rand === 1) status = 'absent';
        else if (rand === 2) { status = 'late'; notes = 'Arrived 20 mins late due to transit'; }
        else if (rand === 3) { status = 'excused'; notes = 'Medical leave sanctioned'; }
        else status = 'present';
      } else if (st.attendanceTendency === 'medium') {
        const rand = (sessionCount + st.fullName.length) % 6;
        if (rand === 0) status = 'absent';
        else if (rand === 1) { status = 'late'; notes = 'Late arrival'; }
        else status = 'present';
      } else {
        // high tendency
        const rand = (sessionCount + st.fullName.length) % 12;
        if (rand === 0) status = 'absent';
        else if (rand === 1) status = 'late';
        else status = 'present';
      }

      db.attendanceRecords.insert({
        _id: `rec_${sessionAlpha._id}_${st._id}`,
        sessionId: sessionAlpha._id,
        batchId: batchAlpha._id,
        studentId: st._id,
        status,
        notes: notes || undefined,
        markedBy: teacher1._id,
        createdAt: `${dateStr}T09:15:00.000Z`,
        updatedAt: `${dateStr}T09:15:00.000Z`,
      });
    }

    // Batch Beta Session (for Math)
    const sessionBeta = db.attendanceSessions.insert({
      _id: `ses_beta_${dateStr}`,
      batchId: batchBeta._id,
      date: dateStr,
      sessionTitle: `Calculus Practice #${sessionCount}`,
      createdBy: teacher2._id,
      finalized: true,
      createdAt: `${dateStr}T11:00:00.000Z`,
      updatedAt: `${dateStr}T12:30:00.000Z`,
    });

    for (const st of betaStudents) {
      let status: 'present' | 'absent' | 'late' | 'excused' = 'present';
      if (st.attendanceTendency === 'low') {
        const rand = (sessionCount + st.fullName.length) % 4;
        status = rand === 0 || rand === 1 ? 'absent' : rand === 2 ? 'late' : 'present';
      } else {
        const rand = (sessionCount + st.fullName.length) % 10;
        status = rand === 0 ? 'absent' : rand === 1 ? 'late' : 'present';
      }

      db.attendanceRecords.insert({
        _id: `rec_${sessionBeta._id}_${st._id}`,
        sessionId: sessionBeta._id,
        batchId: batchBeta._id,
        studentId: st._id,
        status,
        markedBy: teacher2._id,
        createdAt: `${dateStr}T11:15:00.000Z`,
        updatedAt: `${dateStr}T11:15:00.000Z`,
      });
    }
  }

  // 7. Seed Initial Audit Logs
  db.auditLogs.insert({
    _id: 'log_init_01',
    actorId: admin._id,
    actorName: admin.name,
    actorRole: 'admin',
    action: 'SYSTEM_BOOTSTRAP',
    targetType: 'System',
    targetId: 'root',
    details: 'Initial academic database schemas, courses, and faculty accounts seeded.',
    timestamp: now,
  });

  db.auditLogs.insert({
    _id: 'log_init_02',
    actorId: teacher1._id,
    actorName: teacher1.name,
    actorRole: 'teacher',
    action: 'CREATE_SESSION',
    targetType: 'AttendanceSession',
    targetId: `ses_alpha_${today.toISOString().split('T')[0]}`,
    details: 'Generated and verified daily attendance for Batch Alpha.',
    timestamp: now,
  });

  console.log('Database successfully seeded with academic users, batches, and historical sessions.');
}
