import mongoose, { Schema } from 'mongoose';

// User Schema
export const UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'teacher' },
    phone: { type: String },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Number },
    studentId: { type: String },
  },
  { timestamps: true, _id: false }
);

// Course Schema
export const CourseSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true, _id: false }
);

// Batch Schema
export const BatchSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    courseId: { type: String, required: true, ref: 'Course' },
    teacherId: { type: String, required: true, ref: 'User' },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    classDays: { type: [String], default: ['Mon', 'Wed', 'Fri'] },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    room: { type: String },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true, _id: false }
);

// Student Schema
export const StudentSchema = new Schema(
  {
    _id: { type: String, required: true },
    studentId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    avatar: { type: String },
    dob: { type: String },
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    parentName: { type: String, trim: true },
    parentPhone: { type: String, trim: true },
    address: { type: String },
    admissionDate: { type: String, required: true },
    courseId: { type: String, required: true, ref: 'Course' },
    batchId: { type: String, required: true, ref: 'Batch' },
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  },
  { timestamps: true, _id: false }
);

// Enrollment Schema
export const EnrollmentSchema = new Schema(
  {
    _id: { type: String, required: true },
    studentId: { type: String, required: true, ref: 'Student' },
    batchId: { type: String, required: true, ref: 'Batch' },
    startDate: { type: String, required: true },
    endDate: { type: String },
    status: { type: String, enum: ['active', 'transferred', 'completed', 'dropped'], default: 'active' },
  },
  { timestamps: true, _id: false }
);

// AttendanceSession Schema
export const AttendanceSessionSchema = new Schema(
  {
    _id: { type: String, required: true },
    batchId: { type: String, required: true, ref: 'Batch' },
    date: { type: String, required: true },
    sessionTitle: { type: String, required: true },
    createdBy: { type: String, required: true, ref: 'User' },
    finalized: { type: Boolean, default: false },
  },
  { timestamps: true, _id: false }
);
AttendanceSessionSchema.index({ batchId: 1, date: 1 }, { unique: true });

// AttendanceRecord Schema
export const AttendanceRecordSchema = new Schema(
  {
    _id: { type: String, required: true },
    sessionId: { type: String, required: true, ref: 'AttendanceSession' },
    batchId: { type: String, required: true, ref: 'Batch' },
    studentId: { type: String, required: true, ref: 'Student' },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
    notes: { type: String },
    markedBy: { type: String, required: true, ref: 'User' },
    lastModifiedBy: { type: String, ref: 'User' },
  },
  { timestamps: true, _id: false }
);
AttendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

// AuditLog Schema
export const AuditLogSchema = new Schema(
  {
    _id: { type: String, required: true },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    details: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { timestamps: true, _id: false }
);

// Settings Schema
export const SettingsSchema = new Schema(
  {
    _id: { type: String, required: true },
    instituteName: { type: String, default: 'Apex Academy of Sciences' },
    lowAttendanceThreshold: { type: Number, default: 75 },
    lateAttendanceWeight: { type: Number, default: 1.0 },
    excludeExcusedFromDenominator: { type: Boolean, default: true },
    academicYear: { type: String, default: '2026-2027' },
  },
  { timestamps: true, _id: false }
);

// Models
export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const CourseModel = mongoose.models.Course || mongoose.model('Course', CourseSchema);
export const BatchModel = mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
export const StudentModel = mongoose.models.Student || mongoose.model('Student', StudentSchema);
export const EnrollmentModel = mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);
export const AttendanceSessionModel =
  mongoose.models.AttendanceSession ||
  mongoose.model('AttendanceSession', AttendanceSessionSchema);
export const AttendanceRecordModel =
  mongoose.models.AttendanceRecord ||
  mongoose.model('AttendanceRecord', AttendanceRecordSchema);
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export const SettingsModel = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
