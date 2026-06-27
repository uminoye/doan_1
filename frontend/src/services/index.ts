import { api } from './api';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },
  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  },
  getUser() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },
  isAuthenticated() {
    return !!this.getToken();
  },
};

export const userService = {
  getAll() { return api.get('/auth/users'); },
  create(data: { email: string; password: string; full_name: string; role_id: string }) {
    return api.post('/auth/users', data);
  },
  update(id: string, data: { full_name?: string; role_id?: string; password?: string }) {
    return api.put(`/auth/users/${id}`, data);
  },
  delete(id: string) { return api.delete(`/auth/users/${id}`); },
};

export const productService = {
  getAll() { return api.get('/products'); },
  create(data: {
    sku: string; name: string; sale_price: number; unit: string;
    category?: string; image_url?: string; min_stock?: number;
    initial_stock?: number; warehouse_id?: string;
  }) {
    return api.post('/products', data);
  },
  update(id: string, data: {
    sku?: string; name?: string; sale_price?: number; unit?: string;
    category?: string; image_url?: string; min_stock?: number;
    adjust_stock?: number; target_warehouse?: string;
  }) {
    return api.put(`/products/${id}`, data);
  },
  delete(id: string) { return api.delete(`/products/${id}`); },
};

export const customerService = {
  getAll() { return api.get('/customers'); },
  create(data: { company_name: string; phone?: string; address?: string; contact_person?: string }) {
    return api.post('/customers', data);
  },
  delete(id: string) { return api.delete(`/customers/${id}`); },
};

export const warehouseService = {
  getAll() { return api.get('/warehouses'); },
  create(data: { name: string; location?: string }) {
    return api.post('/warehouses', data);
  },
  delete(id: string) { return api.delete(`/warehouses/${id}`); },
};

export const salesOrderService = {
  getAll() { return api.get('/orders'); },
  getItems(id: string) { return api.get(`/orders/${id}/items`); },
  create(data: {
    order_no: string; customer_id: string; order_date?: string;
    expected_delivery_date?: string; note?: string; items: any[];
  }) {
    return api.post('/orders', data);
  },
  update(id: string, data: {
    customer_id?: string; expected_delivery_date?: string; note?: string; items?: any[];
  }) {
    return api.put(`/orders/${id}`, data);
  },
  delete(id: string) { return api.delete(`/orders/${id}`); },
  returnInventory(id: string) { return api.put(`/orders/${id}/return-inventory`); },
};

export const logisticsService = {
  getAll() { return api.get('/logistics'); },
  process(data: { sales_order_id: string; action: string; received_by?: string; note?: string }) {
    return api.post('/logistics/process', data);
  },
};

export const stockOutboundService = {
  getAll() { return api.get('/outbounds'); },
  create(data: {
    note_no: string; sales_order_id: string; warehouse_id: string;
    export_date?: string; note?: string; items?: any[];
  }) {
    return api.post('/outbounds', data);
  },
  respond(id: string, data: { action: string; warehouse_note?: string }) {
    return api.put(`/outbounds/${id}/respond`, data);
  },
};

export const productionReceiptService = {
  getAll() { return api.get('/receipts'); },
  create(data: {
    receipt_no: string; warehouse_id: string; receipt_date?: string;
    note?: string; items: any[];
  }) {
    return api.post('/receipts', data);
  },
  respond(id: string, data: { action: string; reason?: string; expected_delivery_date?: string }) {
    return api.put(`/receipts/${id}/respond`, data);
  },
  confirm(id: string) { return api.put(`/receipts/${id}/confirm`); },
};

export const reportService = {
  getDashboard() { return api.get('/reports/dashboard'); },
  getInventory(params?: { warehouse_id?: string }) { return api.get('/reports/inventory', { params }); },
  getInbound() { return api.get('/reports/inbound'); },
  getOutbound() { return api.get('/reports/outbound'); },
};
