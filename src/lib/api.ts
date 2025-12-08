const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  auth: {
    signup: (data: { email: string; password: string; fullName: string; shortForm: string }) =>
      request<{ user: any; mentor: any }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    signin: (data: { email: string; password: string }) =>
      request<{ user: any; mentor: any }>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    signout: () =>
      request<{ success: boolean }>('/auth/signout', { method: 'POST' }),
    session: () =>
      request<{ user: any; mentor: any }>('/auth/session'),
  },

  students: {
    getAll: (className?: string) =>
      request<any[]>(`/students${className ? `?class=${encodeURIComponent(className)}` : ''}`),
    getWithStats: (className?: string) =>
      request<any[]>(`/students/with-stats${className ? `?class=${encodeURIComponent(className)}` : ''}`),
    create: (data: { name: string; roll_number: string; class: string; photo_url?: string }) =>
      request<any>('/students', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/students/${id}`, { method: 'DELETE' }),
    getHistory: (id: string) =>
      request<any[]>(`/students/${id}/history`),
  },

  classes: {
    getAll: () => request<any[]>('/classes'),
    getAllIncludingInactive: () => request<any[]>('/classes/all'),
    create: (data: { name: string }) =>
      request<any>('/classes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/classes/${id}`, { method: 'DELETE' }),
  },

  attendance: {
    getAll: (params: { class?: string; date?: string; prayer?: string; student_id?: string }) => {
      const query = new URLSearchParams();
      if (params.class) query.append('class', params.class);
      if (params.date) query.append('date', params.date);
      if (params.prayer) query.append('prayer', params.prayer);
      if (params.student_id) query.append('student_id', params.student_id);
      return request<any[]>(`/attendance?${query.toString()}`);
    },
    getByDateRange: (params: { class?: string; start_date?: string; end_date?: string; prayer?: string }) => {
      const query = new URLSearchParams();
      if (params.class) query.append('class', params.class);
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      if (params.prayer) query.append('prayer', params.prayer);
      return request<any[]>(`/attendance/by-date-range?${query.toString()}`);
    },
    create: (data: any) =>
      request<any>('/attendance', { method: 'POST', body: JSON.stringify(data) }),
    createBulk: (records: any[]) =>
      request<any[]>('/attendance/bulk', { method: 'POST', body: JSON.stringify({ records }) }),
    getArchive: (params: { class?: string; original_month?: string }) => {
      const query = new URLSearchParams();
      if (params.class) query.append('class', params.class);
      if (params.original_month) query.append('original_month', params.original_month);
      return request<any[]>(`/attendance/archive?${query.toString()}`);
    },
  },

  tallies: {
    getAll: (studentId?: string) =>
      request<any[]>(`/tallies${studentId ? `?student_id=${studentId}` : ''}`),
    create: (data: any) =>
      request<any>('/tallies', { method: 'POST', body: JSON.stringify(data) }),
    getOther: (studentId?: string) =>
      request<any[]>(`/tallies/other${studentId ? `?student_id=${studentId}` : ''}`),
    createOther: (data: any) =>
      request<any>('/tallies/other', { method: 'POST', body: JSON.stringify(data) }),
    getClassReasons: () => request<any[]>('/tallies/reasons/class'),
    getPerformanceReasons: () => request<any[]>('/tallies/reasons/performance'),
  },

  stars: {
    getAll: (studentId?: string) =>
      request<any[]>(`/stars${studentId ? `?student_id=${studentId}` : ''}`),
    create: (data: any) =>
      request<any>('/stars', { method: 'POST', body: JSON.stringify(data) }),
    getReasons: () => request<any[]>('/stars/reasons'),
    createReason: (data: { reason: string; stars?: number }) =>
      request<any>('/stars/reasons', { method: 'POST', body: JSON.stringify(data) }),
  },

  morningBliss: {
    getAll: (params: { class?: string; date?: string; student_id?: string; start_date?: string; end_date?: string }) => {
      const query = new URLSearchParams();
      if (params.class) query.append('class', params.class);
      if (params.date) query.append('date', params.date);
      if (params.student_id) query.append('student_id', params.student_id);
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      return request<any[]>(`/morning-bliss?${query.toString()}`);
    },
    create: (data: any) =>
      request<any>('/morning-bliss', { method: 'POST', body: JSON.stringify(data) }),
    setWinner: (id: string, is_daily_winner: boolean) =>
      request<any>(`/morning-bliss/${id}/winner`, { method: 'PUT', body: JSON.stringify({ is_daily_winner }) }),
    getToppers: (params: { start_date?: string; end_date?: string; class?: string }) => {
      const query = new URLSearchParams();
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      if (params.class) query.append('class', params.class);
      return request<any[]>(`/morning-bliss/toppers?${query.toString()}`);
    },
  },

  admin: {
    getVoiceOfDirector: () => request<any>('/admin/voice-of-director'),
    updateVoiceOfDirector: (data: { title: string; message: string }) =>
      request<any>('/admin/voice-of-director', { method: 'POST', body: JSON.stringify(data) }),
    getClassReasons: () => request<any[]>('/admin/reasons/class'),
    createClassReason: (data: { reason: string; tally?: number }) =>
      request<any>('/admin/reasons/class', { method: 'POST', body: JSON.stringify(data) }),
    deleteClassReason: (id: string) =>
      request<{ success: boolean }>(`/admin/reasons/class/${id}`, { method: 'DELETE' }),
    getPerformanceReasons: () => request<any[]>('/admin/reasons/performance'),
    createPerformanceReason: (data: { reason: string; tally?: number }) =>
      request<any>('/admin/reasons/performance', { method: 'POST', body: JSON.stringify(data) }),
    deletePerformanceReason: (id: string) =>
      request<{ success: boolean }>(`/admin/reasons/performance/${id}`, { method: 'DELETE' }),
    getStarReasons: () => request<any[]>('/admin/reasons/star'),
    createStarReason: (data: { reason: string; stars?: number }) =>
      request<any>('/admin/reasons/star', { method: 'POST', body: JSON.stringify(data) }),
    deleteStarReason: (id: string) =>
      request<{ success: boolean }>(`/admin/reasons/star/${id}`, { method: 'DELETE' }),
    resetMonthly: () =>
      request<{ success: boolean; message: string }>('/admin/reset-monthly', { method: 'POST' }),
    seedClasses: () =>
      request<any[]>('/admin/seed-classes', { method: 'POST' }),
    getMentors: () => request<any[]>('/admin/mentors'),
    deleteMentor: (id: string) =>
      request<{ success: boolean }>(`/admin/mentors/${id}`, { method: 'DELETE' }),
  },
};
