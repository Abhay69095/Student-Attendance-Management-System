import mongoose from 'mongoose';
import {
  UserModel,
  CourseModel,
  BatchModel,
  StudentModel,
  EnrollmentModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  AuditLogModel,
  SettingsModel,
} from './models.js';

export interface UserDoc {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'teacher' | 'student';
  phone?: string;
  avatar?: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  studentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseDoc {
  _id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface BatchDoc {
  _id: string;
  name: string;
  code: string;
  courseId: string;
  teacherId: string;
  startDate: string;
  endDate: string;
  classDays: string[];
  startTime: string;
  endTime: string;
  room?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface StudentDoc {
  _id: string;
  studentId: string;
  fullName: string;
  avatar?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  phone: string;
  email?: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  admissionDate: string;
  courseId: string;
  batchId: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentDoc {
  _id: string;
  studentId: string;
  batchId: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'transferred' | 'completed' | 'dropped';
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSessionDoc {
  _id: string;
  batchId: string;
  date: string;
  sessionTitle: string;
  createdBy: string;
  finalized: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecordDoc {
  _id: string;
  sessionId: string;
  batchId: string;
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  markedBy: string;
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogDoc {
  _id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface SettingsDoc {
  _id: string;
  instituteName: string;
  lowAttendanceThreshold: number;
  lateAttendanceWeight: number;
  excludeExcusedFromDenominator: boolean;
  academicYear: string;
  updatedAt: string;
}

// MongoDB Atlas Synced Collection with zero local file dependency
class Collection<T extends { _id: string }> {
  private items: Map<string, T> = new Map();

  constructor(public name: string, private model: mongoose.Model<any>) {}

  public async loadFromMongo(): Promise<void> {
    try {
      const docs = await this.model.find({}).lean();
      for (const d of docs) {
        const docId = String(d._id);
        this.items.set(docId, { ...d, _id: docId } as unknown as T);
      }
      console.log(`[MongoDB Atlas] Synced ${this.items.size} documents from collection '${this.name}'`);
    } catch (err: any) {
      console.error(`[MongoDB Atlas] Error syncing '${this.name}':`, err.message);
    }
  }

  public find(filter?: Partial<T> | ((item: T) => boolean)): T[] {
    const all = Array.from(this.items.values());
    if (!filter) return all;
    if (typeof filter === 'function') {
      return all.filter(filter);
    }
    return all.filter((item) => {
      for (const [key, val] of Object.entries(filter)) {
        if ((item as any)[key] !== val) return false;
      }
      return true;
    });
  }

  public findOne(filter: Partial<T> | ((item: T) => boolean)): T | null {
    const list = this.find(filter);
    return list.length > 0 ? list[0] : null;
  }

  public findById(id: string): T | null {
    return this.items.get(id) || null;
  }

  public insert(doc: T): T {
    this.items.set(doc._id, doc);
    // Persist to MongoDB Atlas
    this.model
      .create(doc)
      .catch((err) => console.error(`[MongoDB Atlas] Error inserting into ${this.name}:`, err.message));
    return doc;
  }

  public update(id: string, updates: Partial<T>): T | null {
    const current = this.items.get(id);
    if (!current) return null;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    this.items.set(id, updated);
    // Persist to MongoDB Atlas
    this.model
      .updateOne({ _id: id }, { $set: updates })
      .catch((err) => console.error(`[MongoDB Atlas] Error updating in ${this.name}:`, err.message));
    return updated;
  }

  public delete(id: string): boolean {
    const exists = this.items.has(id);
    if (exists) {
      this.items.delete(id);
      // Delete from MongoDB Atlas
      this.model
        .deleteOne({ _id: id })
        .catch((err) => console.error(`[MongoDB Atlas] Error deleting from ${this.name}:`, err.message));
    }
    return exists;
  }

  public count(filter?: Partial<T> | ((item: T) => boolean)): number {
    return this.find(filter).length;
  }

  public clear(): void {
    this.items.clear();
    this.model
      .deleteMany({})
      .catch((err) => console.error(`[MongoDB Atlas] Error clearing ${this.name}:`, err.message));
  }
}

export const db = {
  users: new Collection<UserDoc>('users', UserModel),
  courses: new Collection<CourseDoc>('courses', CourseModel),
  batches: new Collection<BatchDoc>('batches', BatchModel),
  students: new Collection<StudentDoc>('students', StudentModel),
  enrollments: new Collection<EnrollmentDoc>('enrollments', EnrollmentModel),
  attendanceSessions: new Collection<AttendanceSessionDoc>('attendance_sessions', AttendanceSessionModel),
  attendanceRecords: new Collection<AttendanceRecordDoc>('attendance_records', AttendanceRecordModel),
  auditLogs: new Collection<AuditLogDoc>('audit_logs', AuditLogModel),
  settings: new Collection<SettingsDoc>('settings', SettingsModel),
};

const DEFAULT_MONGO_URI =
  'mongodb+srv://sononeabhay6_db_user:O3KSM3xeMr2EqKsh@cluster0.dzcw1o4.mongodb.net/classattend?appName=Cluster0';

export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

  try {
    console.log('[MongoDB Atlas] Connecting to cluster...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('[MongoDB Atlas] SUCCESS: Connected to MongoDB Atlas cluster!');

    // Sync all collections from MongoDB Atlas
    await Promise.all([
      db.users.loadFromMongo(),
      db.courses.loadFromMongo(),
      db.batches.loadFromMongo(),
      db.students.loadFromMongo(),
      db.enrollments.loadFromMongo(),
      db.attendanceSessions.loadFromMongo(),
      db.attendanceRecords.loadFromMongo(),
      db.auditLogs.loadFromMongo(),
      db.settings.loadFromMongo(),
    ]);

    return true;
  } catch (err: any) {
    console.error(`[MongoDB Atlas] Connection Error: ${err.message}`);
    return false;
  }
}
