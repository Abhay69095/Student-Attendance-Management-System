import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Users,
  GraduationCap,
  Layers,
  CalendarCheck2,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  ArrowUpRight,
  Send,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notify parent modal state
  const [selectedStudentForAlert, setSelectedStudentForAlert] = useState<any>(null);
  const [customNote, setCustomNote] = useState('');
  const [alertSending, setAlertSending] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleSendParentAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForAlert) return;
    try {
      setAlertSending(true);
      const res = await api.notifyParent({
        studentId: selectedStudentForAlert._id,
        messageType: 'Low Attendance Notice',
        customNote,
      });
      setAlertSuccess(res.message);
      setTimeout(() => {
        setSelectedStudentForAlert(null);
        setAlertSuccess(null);
        setCustomNote('');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Notification failed.');
    } finally {
      setAlertSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white rounded-xl border border-slate-200"></div>
          <div className="h-72 bg-white rounded-xl border border-slate-200"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Unable to Load Dashboard</h3>
        <p className="text-xs text-slate-500 mt-1">{error || 'Server connection failed.'}</p>
        <button
          onClick={fetchSummary}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, trend, batchComparison, lowAttendanceStudents, recentActivity } = data;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {user?.role === 'admin' ? 'Academy Executive Dashboard' : 'Faculty Classroom Dashboard'}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span>Welcome back, {user?.name}</span>
            <span>·</span>
            <span className="text-emerald-700 font-medium">Real-Time Database Connected</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/attendance"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Take Attendance</span>
          </Link>

          {user?.role === 'admin' && (
            <>
              <Link
                to="/students"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Add Student</span>
              </Link>
              <Link
                to="/batches"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>New Batch</span>
              </Link>
            </>
          )}

          <button
            onClick={fetchSummary}
            title="Refresh statistics"
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (6 Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Students</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {summary.totalStudents}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Enrolled & Active</p>
        </div>

        {/* Active Teachers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faculty</span>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {summary.totalTeachers}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Active Instructors</p>
        </div>

        {/* Total Batches */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Batches</span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {summary.totalBatches}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Active Cohorts</p>
        </div>

        {/* Today Present */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Present Today
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700 tabular-nums">
            {summary.today.present}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            + {summary.today.late} Late arrivals
          </p>
        </div>

        {/* Today Absent */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Absent Today
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-700 tabular-nums">
            {summary.today.absent}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.today.excused} Excused leave
          </p>
        </div>

        {/* Today Attendance % */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Today's Rate
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-700 tabular-nums">
            {summary.today.total > 0 ? `${summary.today.percentage}%` : 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.today.total} Total marked
          </p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Attendance Trend (Past 14 Days)</h3>
              <p className="text-xs text-slate-500">Overall academic attendance percentage progression</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600"></span> Attendance %
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any) => [`${value}%`, 'Attendance Rate']}
                />
                <Area type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#rateGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Batch-wise Attendance Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Batch-wise Attendance Comparison</h3>
              <p className="text-xs text-slate-500">Average student attendance performance across cohorts</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={batchComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="batchCode" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any, _: any, item: any) => [
                    `${value}% (${item.payload.studentCount} students)`,
                    item.payload.batchName,
                  ]}
                />
                <Bar dataKey="attendanceRate" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Columns: Low Attendance Alerts & Recent Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Attendance Alerts (< 75%) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Low Attendance Alerts (&lt; {summary.threshold}%)
              </h3>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              {lowAttendanceStudents.length} Students At Risk
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {lowAttendanceStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                All active students currently meet the {summary.threshold}% attendance standard.
              </div>
            ) : (
              lowAttendanceStudents.map((st: any) => (
                <div key={st._id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/students/${st._id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 truncate"
                      >
                        {st.fullName}
                      </Link>
                      <span className="text-[11px] text-slate-400 font-mono">({st.studentId})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {st.batchName} · Parent: {st.parentPhone || 'No contact'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-600 tabular-nums">
                        {st.stats.percentage}%
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {st.stats.absent} absent / {st.stats.totalSessions} sessions
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedStudentForAlert(st)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 rounded-lg transition-colors"
                      title="Dispatch SMS / Email Notice"
                    >
                      <Send className="w-3 h-3" />
                      <span>Notify</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Audit Log */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Recent Attendance & Audit Activity
              </h3>
            </div>
            {user?.role === 'admin' && (
              <Link to="/settings" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                View All Logs
              </Link>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {recentActivity.map((log: any) => (
              <div key={log._id} className="p-3.5 text-xs hover:bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] line-clamp-2">{log.details}</p>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                  <span>By: {log.actorName}</span>
                  <span>·</span>
                  <span className="capitalize">{log.actorRole}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notify Parent Alert Modal */}
      {selectedStudentForAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Send Parent Attendance Alert</h3>
            <p className="text-xs text-slate-500 mb-4">
              Dispatches an institutional attendance warning notice to the guardian.
            </p>

            {alertSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{alertSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSendParentAlert} className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <p>
                    <span className="font-semibold text-slate-700">Student:</span>{' '}
                    {selectedStudentForAlert.fullName} ({selectedStudentForAlert.studentId})
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Guardian Phone:</span>{' '}
                    {selectedStudentForAlert.parentPhone || 'No guardian phone registered'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Current Attendance:</span>{' '}
                    <span className="font-bold text-rose-600">
                      {selectedStudentForAlert.stats.percentage}%
                    </span>{' '}
                    (Standard is {summary.threshold}%)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Custom Message / Note</label>
                  <textarea
                    rows={3}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Please be advised that student was absent for 3 consecutive lectures."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForAlert(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={alertSending}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{alertSending ? 'Sending...' : 'Confirm & Dispatch'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
