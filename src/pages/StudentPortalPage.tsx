import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Calendar,
  Layers,
  GraduationCap,
  AlertTriangle,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const StudentPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyAttendance = async () => {
      try {
        setLoading(true);
        // Find matching student by studentId
        const studentsRes = await api.getStudents({ search: user?.studentId || user?.name || '' });
        const matched = studentsRes.students[0];

        if (matched) {
          const report = await api.getStudentReport(matched._id);
          setData(report);
        } else {
          toast.error('Student profile not mapped to current login');
        }
      } catch (err: any) {
        toast.error('Failed to load student attendance records');
      } finally {
        setLoading(false);
      }
    };

    fetchMyAttendance();
  }, [user]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500 animate-pulse">Loading your attendance records...</div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-bold text-slate-800">No Student Profile Linked</p>
        <p className="text-xs text-slate-500 mt-1">Please ensure your user profile is registered with a valid student enrollment.</p>
      </div>
    );
  }

  const { student, stats, monthlyBreakdown, history } = data;
  const isLow = stats.percentage < 75 && stats.totalSessions > 0;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header Banner */}
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
                <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {student.studentId}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {student.batchName} · {student.courseName}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400">Enrolled Batch</p>
            <p className="text-sm font-bold text-slate-900">{student.batchName}</p>
          </div>
        </div>
      </div>

      {/* Low attendance notice */}
      {isLow && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Attention: Attendance Deficit Warning</p>
            <p className="mt-0.5 text-rose-700">
              Your overall attendance is currently {stats.percentage}%, which is below the mandatory institute requirement of 75%.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Attendance %</p>
          <p className={`text-2xl font-black tabular-nums mt-1 ${isLow ? 'text-rose-600' : 'text-emerald-700'}`}>
            {stats.percentage}%
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Lectures</p>
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

      {/* Monthly and Detailed Session Records */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Monthly Attendance Record</h3>
          <div className="space-y-3">
            {monthlyBreakdown.map((m: any) => (
              <div key={m.month} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center justify-between mb-1 font-bold text-slate-800">
                  <span>{m.month}</span>
                  <span className="tabular-nums text-indigo-600">{m.rate}%</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {m.present} Present · {m.absent} Absent · {m.late} Late
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Chronological History Log */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Lecture Attendance Log</h3>
            <p className="text-xs text-slate-500">Read-only student log of all attendance evaluations</p>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Session Title</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Remarks</th>
                  <th className="py-2.5 px-4 text-right">Instructor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h: any) => (
                  <tr key={h._id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-700">{h.date}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{h.sessionTitle}</td>
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
                    <td className="py-2.5 px-4 text-slate-500 italic">{h.notes || '—'}</td>
                    <td className="py-2.5 px-4 text-right text-slate-500">{h.markedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
