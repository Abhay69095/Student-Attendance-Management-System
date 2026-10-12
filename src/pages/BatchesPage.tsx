import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Layers,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  PlusCircle,
  Eye,
  Edit2,
  CheckCircle2,
  X,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const BatchesPage: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'batches' | 'courses'>('batches');
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View Enrolled Students Drawer/Modal
  const [viewingBatch, setViewingBatch] = useState<any | null>(null);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Create Batch Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [batchForm, setBatchForm] = useState({
    name: '',
    code: '',
    courseId: '',
    teacherId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2026-12-31',
    classDays: ['Mon', 'Wed', 'Fri'],
    startTime: '09:00',
    endTime: '10:30',
    room: 'Room 101',
  });

  // Create Course Modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, coursesRes, teachersRes] = await Promise.all([
        api.getBatches({ myBatches: user?.role === 'teacher' }),
        api.getCourses(),
        api.getTeachers(),
      ]);
      setBatches(batchesRes.batches);
      setCourses(coursesRes.courses);
      setTeachers(teachersRes.teachers);

      if (coursesRes.courses.length > 0 && teachersRes.teachers.length > 0) {
        setBatchForm((prev) => ({
          ...prev,
          courseId: coursesRes.courses[0]._id,
          teacherId: teachersRes.teachers[0]._id,
        }));
      }
    } catch (err: any) {
      toast.error('Failed to load courses & cohorts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleOpenStudentsList = async (batch: any) => {
    setViewingBatch(batch);
    try {
      setStudentsLoading(true);
      const res = await api.getBatchStudents(batch._id);
      setBatchStudents(res.students);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load enrolled roster');
      setBatchStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBatch) {
        await api.updateBatch(editingBatch._id, batchForm);
        toast.success('Batch schedule updated.');
      } else {
        await api.createBatch(batchForm);
        toast.success('New batch created successfully.');
      }
      setShowBatchModal(false);
      setEditingBatch(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save batch');
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCourse(courseForm);
      toast.success('Course registered.');
      setShowCourseModal(false);
      setCourseForm({ name: '', code: '', description: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create course');
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Courses & Batches</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize curricula, classroom schedules, faculty allocations, and cohort enrollments.
          </p>
        </div>

        {user?.role === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingBatch(null);
                setShowBatchModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Batch</span>
            </button>

            <button
              onClick={() => setShowCourseModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Add Course</span>
            </button>
          </div>
        )}
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl max-w-xs">
        <button
          onClick={() => setActiveTab('batches')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'batches'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'courses'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Courses ({courses.length})
        </button>
      </div>

      {/* Batches View */}
      {activeTab === 'batches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((b) => (
            <div
              key={b._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded">
                    {b.code}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {b.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{b.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{b.courseName}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">Faculty: <strong className="text-slate-800">{b.teacherName}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{b.classDays.join(', ')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{b.startTime} - {b.endTime}</span>
                  </div>

                  {b.room && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{b.room}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom strip */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  <strong className="text-slate-900 tabular-nums">{b.studentCount}</strong> Enrolled
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenStudentsList(b)}
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    View Roster
                  </button>

                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setEditingBatch(b);
                        setBatchForm({
                          name: b.name,
                          code: b.code,
                          courseId: b.courseId,
                          teacherId: b.teacherId,
                          startDate: b.startDate,
                          endDate: b.endDate,
                          classDays: b.classDays,
                          startTime: b.startTime,
                          endTime: b.endTime,
                          room: b.room || '',
                        });
                        setShowBatchModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded"
                      title="Edit Batch"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Courses View */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {courses.map((c) => (
            <div key={c._id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {c.code}
                </span>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">{c.name}</h3>
              <p className="text-xs text-slate-500 mt-2 line-clamp-3">{c.description || 'Comprehensive curriculum program.'}</p>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>{c.batchCount} Batches</span>
                <span>{c.studentCount} Students</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batch Students Roster Modal */}
      {viewingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingBatch.name} Roster</h3>
                <p className="text-xs text-slate-500">
                  {viewingBatch.code} · Faculty: {viewingBatch.teacherName}
                </p>
              </div>
              <button
                onClick={() => setViewingBatch(null)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {studentsLoading ? (
                <p className="text-xs text-slate-500 text-center py-8">Loading roster...</p>
              ) : batchStudents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No students currently enrolled in this batch.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {batchStudents.map((st) => (
                    <div key={st._id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{st.fullName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{st.studentId} · {st.phone}</p>
                      </div>
                      <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                        Active Enrolment
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingBatch(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingBatch ? 'Edit Batch' : 'Create New Batch'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure batch schedule, assigned faculty, classroom, and course linkage.
            </p>

            <form onSubmit={handleSaveBatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batch Name *</label>
                  <input
                    type="text"
                    required
                    value={batchForm.name}
                    onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                    placeholder="e.g. Batch Delta - Physics"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unique Batch Code *</label>
                  <input
                    type="text"
                    required
                    value={batchForm.code}
                    onChange={(e) => setBatchForm({ ...batchForm, code: e.target.value })}
                    disabled={!!editingBatch}
                    placeholder="e.g. B-PHY-DELTA"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course Curriculum *</label>
                  <select
                    required
                    value={batchForm.courseId}
                    onChange={(e) => setBatchForm({ ...batchForm, courseId: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                  >
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Faculty *</label>
                  <select
                    required
                    value={batchForm.teacherId}
                    onChange={(e) => setBatchForm({ ...batchForm, teacherId: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                  >
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={batchForm.startTime}
                    onChange={(e) => setBatchForm({ ...batchForm, startTime: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={batchForm.endTime}
                    onChange={(e) => setBatchForm({ ...batchForm, endTime: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Classroom / Room</label>
                  <input
                    type="text"
                    value={batchForm.room}
                    onChange={(e) => setBatchForm({ ...batchForm, room: e.target.value })}
                    placeholder="Room 204 or Lab 1"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  {editingBatch ? 'Save Changes' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Academic Course</h3>
            <p className="text-xs text-slate-500 mb-4">
              Define course title, code, and syllabus summary.
            </p>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  placeholder="e.g. Modern Physics Honors"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  placeholder="e.g. PHY-401"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Curriculum Description</label>
                <textarea
                  rows={3}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Topics, lab practicals, target milestones..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
