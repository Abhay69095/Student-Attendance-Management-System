import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, Shield, GraduationCap, User } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@classattend.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login({ email, password });
      if (user.role === 'student') {
        navigate('/student-portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.forgotPassword(forgotEmail);
      setForgotMsg(res.message);
      if (res.demoResetToken) {
        setDemoToken(res.demoResetToken);
      }
    } catch (err: any) {
      setForgotMsg(err.message || 'Failed to dispatch reset request.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoToken) return;
    try {
      await api.resetPassword({ token: demoToken, newPassword });
      setResetSuccess(true);
      setTimeout(() => {
        setShowForgotModal(false);
        setResetSuccess(false);
        setForgotMsg(null);
        setDemoToken(null);
      }, 2000);
    } catch (err: any) {
      setForgotMsg(err.message || 'Reset failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-2 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl mb-4">
          <img
            src="/src/assets/images/academy_crest_emblem_1791807037914.jpg"
            alt="Academy Emblem"
            className="w-16 h-16 rounded-xl object-cover shadow-sm"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">ClassAttend Portal</h2>
        <p className="mt-1 text-xs text-slate-400">
          Attendance Management & Academic Performance System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Quick Demo Role Fill Selector */}
        <div className="mb-4 bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 shadow-md">
          <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
            Instant Demo Logins
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('admin@classattend.com', 'Admin@123')}
              className="flex flex-col items-center py-2 px-1 text-center bg-slate-900/80 hover:bg-indigo-950/60 border border-slate-700 hover:border-indigo-500 rounded-lg transition-colors group"
            >
              <Shield className="w-4 h-4 text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">Admin</span>
              <span className="text-[10px] text-slate-400">Dr. Vance</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('sarah.faculty@classattend.com', 'Teacher@123')}
              className="flex flex-col items-center py-2 px-1 text-center bg-slate-900/80 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500 rounded-lg transition-colors group"
            >
              <GraduationCap className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">Teacher</span>
              <span className="text-[10px] text-slate-400">Prof. Jenkins</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('rahul.student@classattend.com', 'Student@123')}
              className="flex flex-col items-center py-2 px-1 text-center bg-slate-900/80 hover:bg-amber-950/60 border border-slate-700 hover:border-amber-500 rounded-lg transition-colors group"
            >
              <User className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">Student</span>
              <span className="text-[10px] text-slate-400">Rahul Sharma</span>
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-slate-200">
          {error && (
            <div className="mb-5 flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-slate-50/50"
                  placeholder="name@classattend.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-slate-50/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              Role-based permissions verified securely on the server via HTTP-only JWT.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Password Recovery</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your registered academic email to generate a single-use expiring recovery token.
            </p>

            {resetSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Password updated successfully! You can now log in.</span>
              </div>
            ) : demoToken ? (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <p className="font-semibold">Reset Token Generated:</p>
                  <p className="font-mono text-[11px] break-all">{demoToken}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    placeholder="Enter at least 6 characters"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    Set New Password
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                    placeholder="name@classattend.com"
                  />
                </div>
                {forgotMsg && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {forgotMsg}
                  </p>
                )}
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    Send Reset Link
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
