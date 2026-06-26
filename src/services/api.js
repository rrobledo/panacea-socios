import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor – handles 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('panacea_auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Generic CRUD factory ─────────────────────────────────────────────────────
export const createCrudService = (resource) => ({
  list:   (params) => api.get(`/${resource}`, { params }),
  get:    (id)    => api.get(`/${resource}/${id}`),
  create: (data)  => api.post(`/${resource}`, data),
  update: (id, data) => api.put(`/${resource}/${id}`, data),
  patch:  (id, data) => api.patch(`/${resource}/${id}`, data),
  remove: (id)    => api.delete(`/${resource}/${id}`),
});

// ── Pre-built services ────────────────────────────────────────────────────────
export const authService = {
  login:   (data)  => api.post('/auth/login', data),
  profile: ()      => api.get('/auth/profile'),
  refresh: ()      => api.post('/auth/refresh'),
};

export const usersService    = createCrudService('users');
export const productsService = createCrudService('products');
export const ordersService   = createCrudService('orders');
export const reportsService  = {
  ...createCrudService('reports'),
  export: (id, format) => api.get(`/reports/${id}/export?format=${format}`, { responseType: 'blob' }),
};
