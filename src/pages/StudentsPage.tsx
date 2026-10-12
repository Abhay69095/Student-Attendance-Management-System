import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  FileSpreadsheet,
  Download,
  Archive,
  RefreshCw,
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const StudentsPage: React.FC = () => {
  const { user } = useAuth();

  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');

  // Add / Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    phone: '',
    email: '',
    gender: 'Male',
    parentName: '',
    parentPhone: '',
    address: '',
    admissionDate: new Date().toISOString().split('T')[0],
    courseId: '',
    batchId: '',
  });

  // CSV Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const fetchDependencies = async () => {
    try {
      const [batchesRes, coursesRes] = await Promise.all([
        api.getBatches(),
        api.getCourses(),
      ]);
      setBatches(batchesRes.batches);
      setCourses(coursesRes.courses);

      if (batchesRes.batches.length > 0 && !formData.batchId) {
        setFormData((prev) => ({
          ...prev,
          batchId: batchesRes.batches[0]._id,
          courseId: batchesRes.batches[0].courseId,
        }));
      }
    } catch (err: any) {
      toast.error('Failed to load courses & batches');
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.getStudents({
        search,
        batchId: selectedBatch,
        status: selectedStatus,
        page,
        limit: 10,
      });
      setStudents(res.students);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error('Failed to load students list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [search, selectedBatch, selectedStatus, page]);

  // Handle batch change in form to automatically set matching course
  const handleBatchSelectInForm = (batchId: string) => {
    const selected = batches.find((b) => b._id === batchId);
    setFormData((prev) => ({
      ...prev,
      batchId,
      courseId: selected?.courseId || prev.courseId,
    }));
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent._id, formData);
        toast.success('Student details updated.');
      } else {
        await api.createStudent(formData);
        toast.success('Student registered and enrolled successfully.');
      }
      setShowAddModal(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleOpenEdit = (st: any) => {
    setEditingStudent(st);
    setFormData({
      fullName: st.fullName,
      studentId: st.studentId,
      phone: st.phone,
      email: st.email || '',
      gender: st.gender || 'Male',
      parentName: st.parentName || '',
      parentPhone: st.parentPhone || '',
      address: st.address || '',
      admissionDate: st.admissionDate || '',
      courseId: st.courseId,
      batchId: st.batchId,
    });
    setShowAddModal(true);
  };

  const handleArchiveToggle = async (st: any) => {
    const action = st.status === 'archived' ? 'restore' : 'archive';
    if (!window.confirm(`Are you sure you want to ${action} ${st.fullName}? Attendance history will remain intact.`)) {
      return;
    }
    try {
      await api.archiveStudent(st._id);
      toast.success(`Student ${action}d.`);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // CSV import submission
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvRawText.trim()) return;

    try {
      setImportLoading(true);
      // Parse CSV rows
      const lines = csvRawText.trim().split('\n');
      if (lines.length < 2) {
        toast.error('CSV must contain a header and at least one student row.');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const parsedStudents = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = vals[idx] || '';
        });
        parsedStudents.push(obj);
      }

      const res = await api.importStudents(parsedStudents);
      toast.success(res.message);
      setShowImportModal(false);
      setCsvRawText('');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Student Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain student records, parent contacts, batch enrolments, and attendance histories.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'admin' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(null);
                  setFormData({
                    fullName: '',
                    studentId: '',
                    phone: '',
                    email: '',
                    gender: 'Male',
                    parentName: '',
                    parentPhone: '',
                    address: '',
                    admissionDate: new Date().toISOString().split('T')[0],
                    courseId: batches[0]?.courseId || '',
                    batchId: batches[0]?._id || '',
                  });
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Student</span>
              </button>

              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                <span>Import CSV</span>
              </button>
            </>
          )}

          <a
            href={`/api/students/export/csv${selectedBatch ? `?batchId=${selectedBatch}` : ''}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student name, ID, phone, or email..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Batch Filter */}
          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-700"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-700"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
            <option value="all">All Statuses</option>
          </select>

          <button
            onClick={fetchStudents}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Students Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading student directory...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No students found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Enrolled Batch</th>
                  <th className="py-3 px-4">Contacts</th>
                  <th className="py-3 px-4">Attendance Rate</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {students.map((st) => {
                  const percentage = st.stats?.percentage ?? 100;
                  const isLow = percentage < 75 && st.stats?.totalSessions > 0;
                  return (
                    <tr key={st._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {st.studentId}
                      </td>

                      <td className="py-3 px-4">
                        <Link
                          to={`/students/${st._id}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 block"
                        >
                          {st.fullName}
                        </Link>
                        {st.email && (
                          <span className="text-[11px] text-slate-400">{st.email}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <p className="font-medium text-slate-800">{st.batchName}</p>
                        <span className="text-[11px] text-slate-400">{st.courseName}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        <span>{st.phone}</span>
                        {st.parentPhone && (
                          <p className="text-[10px] text-slate-400">Parent: {st.parentPhone}</p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isLow ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold tabular-nums text-xs ${
                              isLow ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {percentage}%
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {st.stats?.present ?? 0} present / {st.stats?.totalSessions ?? 0} sessions
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                            st.status === 'active'
                              ? 'text-emerald-800 bg-emerald-50'
                              : st.status === 'archived'
                              ? 'text-slate-600 bg-slate-100'
                              : 'text-amber-800 bg-amber-50'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/students/${st._id}`}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                            title="View Profile & Attendance History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {user?.role === 'admin' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(st)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                                title="Edit Student"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleArchiveToggle(st)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                                title={st.status === 'archived' ? 'Restore Student' : 'Archive Student'}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total <span className="font-semibold text-slate-800 tabular-nums">{total}</span> registered students
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingStudent ? 'Edit Student Details' : 'Register New Student'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter student credentials, batch assignment, and guardian contact details.
            </p>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student ID (Optional - auto generated if blank)
                  </label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    disabled={!!editingStudent}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                    placeholder="e.g. STU-2026-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                    placeholder="student@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admission Date</label>
                  <input
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Batch *</label>
                  <select
                    required
                    value={formData.batchId}
                    onChange={(e) => handleBatchSelectInForm(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                  >
                    {batches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                    placeholder="e.g. Sanjay Sharma"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parent Phone (For Alerts)</label>
                  <input
                    type="text"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                    placeholder="+1 (555) 111-2222"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                    placeholder="Street, City, Sector"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  {editingStudent ? 'Save Updates' : 'Enrol Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Import Students via CSV</h3>
            <p className="text-xs text-slate-500 mb-3">
              Paste standard CSV rows with columns: <code>fullName, phone, batchCode, email, parentPhone</code>
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <textarea
                  rows={8}
                  required
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  placeholder={`fullName,phone,batchCode,email,parentPhone
Amit Kumar,+1 555-890-1122,B-PHY-ALPHA,amit@example.com,+1 555-890-1123
Pooja Hegde,+1 555-890-2233,B-MTH-BETA,pooja@example.com,+1 555-890-2234`}
                  className="w-full font-mono text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setCsvRawText(`fullName,phone,batchCode,email,parentPhone
Amit Kumar,+1 555-890-1122,B-PHY-ALPHA,amit@example.com,+1 555-890-1123
Pooja Hegde,+1 555-890-2233,B-MTH-BETA,pooja@example.com,+1 555-890-2234`)
                  }
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Fill Sample CSV
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importLoading || !csvRawText.trim()}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {importLoading ? 'Importing...' : 'Parse & Import'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
