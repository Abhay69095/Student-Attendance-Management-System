// API client using fetch with credentials: 'include' for secure HTTP-only cookies

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('classattend_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // transmits HTTP-only auth_token cookie
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  login: async (credentials: { email: string; password: string }) => {
    const res = await request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.token) {
      localStorage.setItem('classattend_token', res.token);
    }
    return res;
  },
  logout: async () => {
    try {
      return await request<{ message: string }>('/api/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('classattend_token');
    }
  },
  getMe: () => request<{ user: any }>('/api/auth/me'),
  forgotPassword: (email: string) =>
    request<{ message: string; demoResetToken?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload: { token: string; newPassword: string }) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/api/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Students
  getStudents: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ students: any[]; total: number; page: number; totalPages: number }>(
      `/api/students${query ? `?${query}` : ''}`
    );
  },
  getStudentById: (id: string) => request<{ student: any }>(`/api/students/${id}`),
  createStudent: (studentData: any) =>
    request<{ student: any; message: string }>('/api/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    }),
  updateStudent: (id: string, updates: any) =>
    request<{ student: any; message: string }>(`/api/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  archiveStudent: (id: string) =>
    request<{ student: any; message: string }>(`/api/students/${id}/archive`, {
      method: 'PATCH',
    }),
  importStudents: (studentsData: any[]) =>
    request<{ message: string; importedCount: number; errors?: string[] }>(
      '/api/students/import',
      {
        method: 'POST',
        body: JSON.stringify({ studentsData }),
      }
    ),

  // Courses & Batches
  getCourses: () => request<{ courses: any[] }>('/api/courses'),
  createCourse: (data: { name: string; code: string; description?: string }) =>
    request<{ course: any; message: string }>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getBatches: (params: { myBatches?: boolean } = {}) => {
    const q = params.myBatches ? '?myBatches=true' : '';
    return request<{ batches: any[] }>(`/api/batches${q}`);
  },
  getBatchById: (id: string) => request<{ batch: any }>(`/api/batches/${id}`),
  createBatch: (data: any) =>
    request<{ batch: any; message: string }>('/api/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBatch: (id: string, updates: any) =>
    request<{ batch: any; message: string }>(`/api/batches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  getBatchStudents: (id: string) => request<{ students: any[] }>(`/api/batches/${id}/students`),

  // Attendance
  getSessions: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ sessions: any[] }>(`/api/attendance/sessions${query ? `?${query}` : ''}`);
  },
  createOrGetSession: (data: { batchId: string; date: string; sessionTitle?: string }) =>
    request<{ session: any; isExisting: boolean; message: string }>('/api/attendance/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSessionDetails: (id: string) =>
    request<{ session: any; batch: any; students: any[] }>(`/api/attendance/sessions/${id}`),
  saveSessionRecords: (
    sessionId: string,
    data: { records: Array<{ studentId: string; status: string; notes?: string }>; sessionTitle?: string }
  ) =>
    request<{ message: string; summary: any }>(`/api/attendance/sessions/${sessionId}/records`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  correctAttendanceRecord: (recordId: string, data: { status: string; notes?: string; reason?: string }) =>
    request<{ message: string; record: any }>(`/api/attendance/records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Reports
  getDashboardSummary: () =>
    request<{
      summary: any;
      trend: any[];
      batchComparison: any[];
      lowAttendanceStudents: any[];
      recentActivity: any[];
    }>('/api/attendance/reports/summary'),
  getStudentReport: (studentId: string) =>
    request<{ student: any; stats: any; monthlyBreakdown: any[]; history: any[] }>(
      `/api/attendance/reports/student/${studentId}`
    ),
  getBatchReport: (batchId: string, params: { startDate?: string; endDate?: string } = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<{ batch: any; students: any[]; sessions: any[] }>(
      `/api/attendance/reports/batch/${batchId}${q ? `?${q}` : ''}`
    );
  },

  // Teachers
  getTeachers: () => request<{ teachers: any[] }>('/api/teachers'),
  createTeacher: (data: any) =>
    request<{ teacher: any; message: string }>('/api/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTeacher: (id: string, updates: any) =>
    request<{ teacher: any; message: string }>(`/api/teachers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Settings & Alerts
  getSettings: () => request<{ settings: any }>('/api/settings'),
  updateSettings: (data: any) =>
    request<{ settings: any; message: string }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getAuditLogs: () => request<{ logs: any[] }>('/api/settings/audit-logs'),
  notifyParent: (data: { studentId: string; messageType?: string; customNote?: string }) =>
    request<{ success: boolean; message: string }>('/api/settings/alerts/notify-parent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
