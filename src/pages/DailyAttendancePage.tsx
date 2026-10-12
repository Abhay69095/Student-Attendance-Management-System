import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Save,
  RotateCcw,
  CheckCheck,
  AlertCircle,
  History,
  FileEdit,
  ShieldCheck,
  Search,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface StudentAttendanceRow {
  studentId: string;
  studentCode: string;
  fullName: string;
  phone: string;
  parentPhone?: string;
  recordId: string | null;
  status: 'present' | 'absent' | 'late' | 'excused' | null;
  notes: string;
  lastModified?: string | null;
}

export const DailyAttendancePage: React.FC = () => {
  const { user } = useAuth();

  // Selection filters
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [sessionTitle, setSessionTitle] = useState<string>('');

  // Loaded session state
  const [session, setSession] = useState<any | null>(null);
  const [students, setStudents] = useState<StudentAttendanceRow[]>([]);
  const [initialStateHash, setInitialStateHash] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [isExistingSession, setIsExistingSession] = useState<boolean>(false);

  // Correction Modal State (for audited single edit)
  const [correctingRow, setCorrectingRow] = useState<StudentAttendanceRow | null>(null);
  const [newStatus, setNewStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionSaving, setCorrectionSaving] = useState<boolean>(false);

  // Fetch batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await api.getBatches({ myBatches: user?.role === 'teacher' });
        setBatches(res.batches);
        if (res.batches.length > 0) {
          setSelectedBatchId(res.batches[0]._id);
        }
      } catch (err: any) {
        toast.error('Failed to load classes & batches');
      }
    };
    fetchBatches();
  }, [user]);

  // Load or create session when batch and date change
  const loadAttendanceSession = async () => {
    if (!selectedBatchId || !selectedDate) return;
    try {
      setLoading(true);

      // 1. Get or create session
      const sessionRes = await api.createOrGetSession({
        batchId: selectedBatchId,
        date: selectedDate,
      });

      setIsExistingSession(sessionRes.isExisting);
      setSession(sessionRes.session);
      setSessionTitle(sessionRes.session.sessionTitle || '');

      // 2. Load detailed session records and students
      const details = await api.getSessionDetails(sessionRes.session._id);

      const rows: StudentAttendanceRow[] = details.students.map((st: any) => ({
        studentId: st.studentId,
        studentCode: st.studentCode,
        fullName: st.fullName,
        phone: st.phone,
        parentPhone: st.parentPhone,
        recordId: st.recordId,
        status: st.status || null,
        notes: st.notes || '',
        lastModified: st.lastModified,
      }));

      setStudents(rows);
      setInitialStateHash(JSON.stringify(rows));

      if (sessionRes.isExisting) {
        toast.success(`Loaded saved session for ${selectedDate}.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to open attendance session');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId && selectedDate) {
      loadAttendanceSession();
    }
  }, [selectedBatchId, selectedDate]);

  // Check if dirty
  const isDirty = JSON.stringify(students) !== initialStateHash;

  // Status counters
  const totalCount = students.length;
  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const lateCount = students.filter((s) => s.status === 'late').length;
  const excusedCount = students.filter((s) => s.status === 'excused').length;
  const unmarkedCount = students.filter((s) => s.status === null).length;

  // Fast Bulk Actions
  const handleMarkAll = (status: 'present' | 'absent') => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status,
      }))
    );
  };

  const handleResetAll = () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: null,
        notes: '',
      }))
    );
  };

  // Change individual student status
  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  // Change notes
  const handleNotesChange = (studentId: string, notes: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, notes } : s))
    );
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    if (!session) return;
    if (unmarkedCount > 0) {
      const confirmUnmarked = window.confirm(
        `There are ${unmarkedCount} unmarked students. Save attendance anyway? (Unmarked will not count as attended)`
      );
      if (!confirmUnmarked) return;
    }

    try {
      setSaving(true);
      const recordsToSave = students
        .filter((s) => s.status !== null)
        .map((s) => ({
          studentId: s.studentId,
          status: s.status as string,
          notes: s.notes,
        }));

      const res = await api.saveSessionRecords(session._id, {
        records: recordsToSave,
        sessionTitle,
      });

      toast.success(res.message || 'Attendance records committed to database.');
      // Refresh session
      await loadAttendanceSession();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit attendance');
    } finally {
      setSaving(false);
    }
  };

  // Correct record with audit log
  const handleConfirmCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRow || !correctingRow.recordId) return;

    try {
      setCorrectionSaving(true);
      await api.correctAttendanceRecord(correctingRow.recordId, {
        status: newStatus,
        reason: correctionReason,
      });

      toast.success('Record corrected with audit trail entry.');
      setCorrectingRow(null);
      setCorrectionReason('');
      await loadAttendanceSession();
    } catch (err: any) {
      toast.error(err.message || 'Correction failed');
    } finally {
      setCorrectionSaving(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(filterSearch.toLowerCase()) ||
      s.phone.includes(filterSearch)
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Top Banner / Session Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Daily Attendance Roll Call
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select batch and session date to record or audit student attendance.
            </p>
          </div>

          {/* Existing Session status indicator */}
          <div className="flex items-center gap-2">
            {isExistingSession ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved Session (Changes Audited)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>New Session Ready</span>
              </span>
            )}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Batch</label>
            <div className="relative">
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:bg-white"
              >
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Attendance Date</label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Session Title / Topic</label>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="e.g. Mechanics Lecture #12"
              className="w-full text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Live Status Counters & Fast Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Counters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
            Total Enrolled: <span className="font-bold tabular-nums text-slate-900">{totalCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
            Present: <span className="font-bold tabular-nums">{presentCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800">
            Absent: <span className="font-bold tabular-nums">{absentCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800">
            Late: <span className="font-bold tabular-nums">{lateCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-800">
            Excused: <span className="font-bold tabular-nums">{excusedCount}</span>
          </div>
          {unmarkedCount > 0 && (
            <div className="px-3 py-1.5 bg-slate-200/80 rounded-lg text-xs font-medium text-slate-600">
              Unmarked: <span className="font-bold tabular-nums">{unmarkedCount}</span>
            </div>
          )}
        </div>

        {/* Quick Batch Controls & Submit */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMarkAll('present')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Present</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={saving || students.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
          </button>
        </div>
      </div>

      {/* Dirty unsaved state notice */}
      {isDirty && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You have unsaved changes in this attendance roll. Please click "Save Attendance" to persist to the database.</span>
          </div>
        </div>
      )}

      {/* Student Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header / In-Table Search */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search enrolled students..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800 tabular-nums">{filteredStudents.length}</span> students
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading student roster...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No students found matching your search or enrolled in this batch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-center">Attendance Status</th>
                  <th className="py-3 px-4">Session Notes</th>
                  <th className="py-3 px-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredStudents.map((st) => (
                  <tr key={st.studentId} className="hover:bg-slate-50/80 transition-colors">
                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {st.studentCode}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{st.fullName}</p>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 text-slate-500">
                      <span>{st.phone}</span>
                      {st.parentPhone && (
                        <p className="text-[10px] text-slate-400">Parent: {st.parentPhone}</p>
                      )}
                    </td>

                    {/* Attendance Status Segmented Button Control */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-lg">
                        {/* Present */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.studentId, 'present')}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            st.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-200/70'
                          }`}
                        >
                          Present
                        </button>

                        {/* Absent */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.studentId, 'absent')}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            st.status === 'absent'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-rose-700 hover:bg-slate-200/70'
                          }`}
                        >
                          Absent
                        </button>

                        {/* Late */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.studentId, 'late')}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            st.status === 'late'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-amber-700 hover:bg-slate-200/70'
                          }`}
                        >
                          Late
                        </button>

                        {/* Excused */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.studentId, 'excused')}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            st.status === 'excused'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-indigo-700 hover:bg-slate-200/70'
                          }`}
                        >
                          Excused
                        </button>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={st.notes}
                        onChange={(e) => handleNotesChange(st.studentId, e.target.value)}
                        placeholder="Optional remarks..."
                        className="w-full text-xs py-1 px-2.5 border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-600"
                      />
                    </td>

                    {/* Audit / Single Edit */}
                    <td className="py-3 px-4 text-right">
                      {st.recordId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectingRow(st);
                            setNewStatus(st.status || 'present');
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                          title="Audit correction"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Unsaved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Correction Modal */}
      {correctingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Correct Attendance Record
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              All manual modifications to previously finalized attendance create an immutable audit trail.
            </p>

            <form onSubmit={handleConfirmCorrection} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <p>
                  <span className="font-semibold text-slate-700">Student:</span>{' '}
                  {correctingRow.fullName} ({correctingRow.studentCode})
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Current Saved Status:</span>{' '}
                  <span className="font-bold uppercase text-slate-900">{correctingRow.status}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Correction (Required for Audit Log)
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Student submitted doctor's note for earlier absence."
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectingRow(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctionSaving || !correctionReason.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {correctionSaving ? 'Saving...' : 'Apply Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
