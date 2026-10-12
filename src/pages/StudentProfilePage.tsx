import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  AlertTriangle,
  Send,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const StudentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [alertNote, setAlertNote] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertSending, setAlertSending] = useState(false);

  const fetchStudentData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getStudentReport(id);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load student record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setAlertSending(true);
      const res = await api.notifyParent({
        studentId: id,
        messageType: 'Attendance Summary Notice',
        customNote: alertNote,
      });
      toast.success(res.message);
      setShowAlertModal(false);
      setAlertNote('');
    } catch (err: any) {
      toast.error(err.message || 'Notification failed');
    } finally {
      setAlertSending(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500 animate-pulse">Loading student record...</div>;
  }

  if (!data || !data.student) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-bold text-slate-800">Student Not Found</p>
        <Link to="/students" className="mt-3 inline-block text-xs text-indigo-600 hover:underline">
          Return to Student Directory
        </Link>
      </div>
    );
  }

  const { student, stats, monthlyBreakdown, history } = data;
  const isLow = stats.percentage < 75 && stats.totalSessions > 0;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Back button */}
      <div>
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students Directory</span>
        </Link>
      </div>

      {/* Student Banner Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-lg text-indigo-700 uppercase">
              {student.fullName.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {student.fullName}
                </h2>
                <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {student.studentId}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {student.batchName} · {student.courseName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAlertModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Notify Guardian</span>
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div>
            <p className="text-slate-400 font-medium mb-1">Student Phone</p>
            <p className="font-semibold text-slate-800">{student.phone}</p>
          </div>

          <div>
            <p className="text-slate-400 font-medium mb-1">Guardian Phone</p>
            <p className="font-semibold text-slate-800">
              {student.parentPhone || 'Not specified'} ({student.parentName || 'Parent'})
            </p>
          </div>

          <div>
            <p className="text-slate-400 font-medium mb-1">Email Address</p>
            <p className="font-semibold text-slate-800">{student.email || 'N/A'}</p>
          </div>

          <div>
            <p className="text-slate-400 font-medium mb-1">Admission Date</p>
            <p className="font-semibold text-slate-800">{student.admissionDate}</p>
          </div>
        </div>
      </div>

      {/* Low Attendance Warning Callout */}
      {isLow && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Attendance Deficit Warning (&lt; 75%)</p>
            <p className="mt-0.5 text-rose-700">
              This student has only attended {stats.percentage}% of eligible sessions. Minimum institute threshold is 75%.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Rate</p>
          <p className={`text-2xl font-black tabular-nums mt-1 ${isLow ? 'text-rose-600' : 'text-emerald-700'}`}>
            {stats.percentage}%
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sessions</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">{stats.totalSessions}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Present</p>
          <p className="text-2xl font-black text-emerald-700 tabular-nums mt-1">{stats.present}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Absent</p>
          <p className="text-2xl font-black text-rose-700 tabular-nums mt-1">{stats.absent}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Late</p>
          <p className="text-2xl font-black text-amber-700 tabular-nums mt-1">{stats.late}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Excused</p>
          <p className="text-2xl font-black text-indigo-700 tabular-nums mt-1">{stats.excused}</p>
        </div>
      </div>

      {/* Two Column Grid: Monthly Breakdown & History Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Monthly Attendance Trend</h3>
          <div className="space-y-3">
            {monthlyBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500">No monthly data logged yet.</p>
            ) : (
              monthlyBreakdown.map((m: any) => (
                <div key={m.month} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1.5 font-bold text-slate-800">
                    <span>{m.month}</span>
                    <span className="tabular-nums text-indigo-600">{m.rate}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>P: {m.present}</span>
                    <span>A: {m.absent}</span>
                    <span>L: {m.late}</span>
                    <span>E: {m.excused}</span>
                    <span>Total: {m.total}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Full Date-Wise Attendance History */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Session Attendance History</h3>
            <p className="text-xs text-slate-500">Chronological attendance audit log for this student</p>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Session Title</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Remarks / Notes</th>
                  <th className="py-2.5 px-4 text-right">Faculty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h: any) => (
                  <tr key={h._id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-700">
                      {h.date}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {h.sessionTitle}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                          h.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : h.status === 'absent'
                            ? 'bg-rose-100 text-rose-800'
                            : h.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 italic">
                      {h.notes || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {h.markedByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Notify Guardian Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Dispatch Parent Notice</h3>
            <p className="text-xs text-slate-500 mb-4">
              Send attendance summary to guardian ({student.parentName || 'Guardian'}).
            </p>

            <form onSubmit={handleSendAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Note</label>
                <textarea
                  rows={3}
                  value={alertNote}
                  onChange={(e) => setAlertNote(e.target.value)}
                  placeholder="e.g. Please note current overall attendance stands at 72%."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={alertSending}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {alertSending ? 'Sending...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
