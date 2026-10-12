import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  Settings,
  ShieldCheck,
  Save,
  Search,
  Filter,
  RefreshCw,
  Building,
  CheckCircle2,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    instituteName: 'Apex Academy of Sciences',
    lowAttendanceThreshold: 75,
    lateAttendanceWeight: 1.0,
    excludeExcusedFromDenominator: true,
    academicYear: '2026-2027',
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, logsRes] = await Promise.all([
        api.getSettings(),
        api.getAuditLogs(),
      ]);
      setSettings(settingsRes.settings);
      setLogs(logsRes.logs);
    } catch (err: any) {
      toast.error('Failed to load settings or audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.updateSettings(settings);
      toast.success(res.message || 'System settings updated.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.actorName.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.details.toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System Settings & Audit Trail</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure attendance scoring rules, threshold alerts, and inspect the chronological audit history.
        </p>
      </div>

      {/* Institutional Policy Settings Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Building className="w-4 h-4 text-indigo-600" />
          <span>Institutional Policies & Scoring Rules</span>
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Adjust parameters governing attendance threshold warnings and report percentages.
        </p>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Institute Name</label>
              <input
                type="text"
                required
                value={settings.instituteName}
                onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year / Session</label>
              <input
                type="text"
                required
                value={settings.academicYear}
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Low Attendance Alert Threshold (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={settings.lowAttendanceThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, lowAttendanceThreshold: Number(e.target.value) })
                }
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Students below this percentage trigger guardian alerts and dashboard warnings.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Late Attendance Credit Weight
              </label>
              <select
                value={settings.lateAttendanceWeight}
                onChange={(e) =>
                  setSettings({ ...settings, lateAttendanceWeight: parseFloat(e.target.value) })
                }
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              >
                <option value={1.0}>1.0 (Counts fully as attended)</option>
                <option value={0.5}>0.5 (Counts as half-session attended)</option>
                <option value={0.0}>0.0 (Does not count toward attendance credit)</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                id="excludeExcused"
                checked={settings.excludeExcusedFromDenominator}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    excludeExcusedFromDenominator: e.target.checked,
                  })
                }
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <label htmlFor="excludeExcused" className="text-xs text-slate-700">
                <strong>Exclude Excused Leave from Total Eligible Sessions</strong>
                <p className="text-[11px] text-slate-500">
                  When enabled, excused medical leaves do not penalize the student's attendance percentage.
                </p>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Audit Log Trail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Chronological System Audit Trail</h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <button
              onClick={fetchData}
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
              title="Refresh Logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Change Log Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((l: any) => (
                <tr key={l._id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-800">
                    <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <p className="font-semibold text-slate-900">{l.actorName}</p>
                    <span className="text-[10px] text-slate-400 capitalize">{l.actorRole}</span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {l.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
