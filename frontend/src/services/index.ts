import { api } from './api';
import { AuthResponse, User } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('wms_token', data.token);
    localStorage.setItem('wms_user', JSON.stringify(data.user));
    return data;
  },
  logout() {
    localStorage.removeItem('wms_token');
    localStorage.removeItem('wms_user');
  },
  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('wms_user');
    return user ? JSON.parse(user) : null;
  },
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('wms_token');
  },
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
  getProfile() {
    return api.get<User>('/auth/profile');
  },
};

export const userService = {
  getAll(params?: { page?: number; limit?: number; search?: string; roleId?: string }) {
    return api.get('/auth/users', { params });
  },
  getById(id: string) {
    return api.get(`/auth/users/${id}`);
  },
  create(data: { fullName: string; email: string; password: string; roleId: string }) {
    return api.post('/auth/users', data);
  },
  update(id: string, data: { fullName?: string; roleId?: string; status?: string }) {
    return api.put(`/auth/users/${id}`, data);
  },
  delete(id: string) {
    return api.delete(`/auth/users/${id}`);
  },
  getRoles() {
    return api.get('/auth/roles');
  },
};

export const customerService = {
  getAll(params?: { page?: number; limit?: number; search?: string }) {
    return api.get('/master/customers', { params });
  },
  getById(id: string) {
    return api.get(`/master/customers/${id}`);
  },
  create(data: { customerCode: string; name: string; phone?: string; address?: string; contactPerson?: string }) {
    return api.post('/master/customers', data);
  },
  update(id: string, data: Partial<{ name: string; phone: string; address: string; contactPerson: string }>) {
    return api.put(`/master/customers/${id}`, data);
  },
  delete(id: string) {
    return api.delete(`/master/customers/${id}`);
  },
};

export const warehouseService = {
  getAll() {
    return api.get('/master/warehouses');
  },
  getById(id: string) {
    return api.get(`/master/warehouses/${id}`);
  },
  create(data: { warehouseCode?: string; name: string; location?: string }) {
    return api.post('/master/warehouses', data);
  },
  update(id: string, data: Partial<{ name: string; location: string }>) {
    return api.put(`/master/warehouses/${id}`, data);
  },
  delete(id: string) {
    return api.delete(`/master/warehouses/${id}`);
  },
};

export const productService = {
  getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    warehouseId?: string;
    stockStatus?: 'all' | 'low' | 'out';
  }) {
    return api.get('/master/products', { params });
  },
  getById(id: string) {
    return api.get(`/master/products/${id}`);
  },
  create(data: {
    sku?: string;
    name: string;
    unit?: string;
    category?: string;
    imageUrl?: string;
    salePrice?: number;
    minStock?: number;
    stockDistribution?: Record<string, number>;
  }) {
    return api.post('/master/products', data);
  },
  update(id: string, data: Partial<{
    name: string;
    unit: string;
    category: string;
    imageUrl: string;
    salePrice: number;
    minStock: number;
    stockDistribution?: Record<string, number>;
  }>) {
    return api.put(`/master/products/${id}`, data);
  },
  delete(id: string) {
    return api.delete(`/master/products/${id}`);
  },
  getCategories() {
    return api.get('/master/products/categories/list');
  },
};

export const categoryService = {
  getAll() {
    return api.get('/master/categories');
  },
  create(data: { categoryCode?: string; name: string }) {
    return api.post('/master/categories', data);
  },
  update(id: string, data: { name: string }) {
    return api.put(`/master/categories/${id}`, data);
  },
  delete(id: string) {
    return api.delete(`/master/categories/${id}`);
  },
};

export const productionReceiptService = {
  getAll(params?: { page?: number; limit?: number; status?: string; startDate?: string; endDate?: string }) {
    return api.get('/transactions/production-receipts', { params });
  },
  getById(id: string) {
    return api.get(`/transactions/production-receipts/${id}`);
  },
  create(data: { warehouseId: string; receiptDate?: string; note?: string; items: { productId: string; quantity: number }[] }) {
    return api.post('/transactions/production-receipts', data);
  },
  factoryRespond(data: { receiptId: string; action: 'accept' | 'reject'; expectedDeliveryDate?: string; reason?: string }) {
    return api.post(`/transactions/production-receipts/${data.receiptId}/factory-respond`, data);
  },
  confirmReceipt(id: string) {
    return api.post(`/transactions/production-receipts/${id}/confirm`);
  },
  cancel(id: string) {
    return api.post(`/transactions/production-receipts/${id}/cancel`);
  },
  delete(id: string) {
    return api.delete(`/transactions/production-receipts/${id}`);
  },
};

export const salesOrderService = {
  getAll(params?: { page?: number; limit?: number; status?: string; customerId?: string; startDate?: string; endDate?: string }) {
    return api.get('/transactions/sales-orders', { params });
  },
  getById(id: string) {
    return api.get(`/transactions/sales-orders/${id}`);
  },
  create(data: { customerId: string; orderDate?: string; expectedDeliveryDate?: string; note?: string; items: { productId: string; quantity: number; unitPrice?: number }[] }) {
    return api.post('/transactions/sales-orders', data);
  },
  update(id: string, data: { customerId?: string; expectedDeliveryDate?: string; note?: string; items?: { productId: string; quantity: number; unitPrice?: number }[] }) {
    return api.put(`/transactions/sales-orders/${id}`, data);
  },
  processLogistics(salesOrderId: string, newStatus: string, note?: string) {
    return api.post(`/transactions/sales-orders/${salesOrderId}/process-logistics`, { newStatus, note });
  },
  reportWarehouseIssue(salesOrderId: string, issueNote: string) {
    return api.post(`/transactions/sales-orders/${salesOrderId}/report-issue`, { issueNote });
  },
  exportOrder(salesOrderId: string, warehouseId: string) {
    return api.post(`/transactions/sales-orders/${salesOrderId}/export`, { warehouseId });
  },
  confirmDelivery(salesOrderId: string) {
    return api.post(`/transactions/sales-orders/${salesOrderId}/confirm-delivery`);
  },
  returnInventory(salesOrderId: string) {
    return api.post(`/transactions/sales-orders/${salesOrderId}/return-inventory`);
  },
  confirmDelay(salesOrderId: string) {
    return api.post(`/transactions/sales-orders/${salesOrderId}/confirm-delay`);
  },
  resendToWarehouse(salesOrderId: string, newExpectedDate: string) {
    return api.post(`/transactions/sales-orders/${salesOrderId}/resend-to-warehouse`, { newExpectedDate });
  },
  recreate(data: {
    warehouseRejectedOrderId: string;
    customerId: string;
    expectedDeliveryDate?: string;
    note?: string;
    items: { productId: string; quantity: number; unitPrice?: number }[];
  }) {
    return api.post(`/transactions/sales-orders/${data.warehouseRejectedOrderId}/recreate`, {
      customerId: data.customerId,
      expectedDeliveryDate: data.expectedDeliveryDate,
      note: data.note,
      items: data.items,
    });
  },
  delete(id: string) {
    return api.delete(`/transactions/sales-orders/${id}`);
  },
};

export const logisticsService = {
  getAll(params?: { page?: number; limit?: number; status?: string }) {
    return api.get('/transactions/logistics', { params });
  },
  forwardToWarehouse(salesOrderId: string, note?: string) {
    return api.post('/transactions/logistics/forward', { salesOrderId, note });
  },
  rejectOrder(salesOrderId: string, reason: string) {
    return api.post('/transactions/logistics/reject', { salesOrderId, reason });
  },
  confirmDelivery(salesOrderId: string) {
    return api.post('/transactions/logistics/confirm-delivery', { salesOrderId });
  },
};

export const stockOutboundService = {
  getAll(params?: { page?: number; limit?: number; status?: string; startDate?: string; endDate?: string }) {
    return api.get('/transactions/stock-outbound', { params });
  },
  getPendingRequests() {
    return api.get('/transactions/stock-outbound/pending');
  },
  getById(id: string) {
    return api.get(`/transactions/stock-outbound/${id}`);
  },
  create(data: { salesOrderId: string; warehouseId: string; exportDate?: string; note?: string }) {
    return api.post('/transactions/stock-outbound', data);
  },
  respondOutbound(salesOrderId: string, action: 'reject' | 'delay', reason?: string, expectedDate?: string) {
    return api.post(`/transactions/stock-outbound/${salesOrderId}/respond`, { action, reason, expectedDate });
  },
  cancel(id: string) {
    return api.post(`/transactions/stock-outbound/${id}/cancel`);
  },
  delete(id: string) {
    return api.delete(`/transactions/stock-outbound/${id}`);
  },
};

export const carrierService = {
  getAll() {
    return api.get('/transactions/carriers');
  },
  create(data: { name: string; code: string; autoPrefix?: string }) {
    return api.post('/transactions/carriers', data);
  },
  update(id: string, data: { name?: string; autoPrefix?: string }) {
    return api.put(`/transactions/carriers/${id}`, data);
  },
  delete(id: string) {
    return api.delete(`/transactions/carriers/${id}`);
  },
};

export const notificationService = {
  getAll(params?: { page?: number; limit?: number; type?: string; status?: string }) {
    return api.get('/transactions/notifications', { params });
  },
  resolve(id: string) {
    return api.post(`/transactions/notifications/${id}/resolve`);
  },
  delete(id: string) {
    return api.delete(`/transactions/notifications/${id}`);
  },
};

export const shipmentService = {
  getAllTracking(params?: { page?: number; limit?: number; status?: string }) {
    return api.get('/transactions/shipments/tracking', { params });
  },
  getSteps() {
    return api.get('/transactions/shipments/steps');
  },
  getRejectionReasons() {
    return api.get('/transactions/shipments/rejection-reasons');
  },
  getByOrderId(salesOrderId: string) {
    return api.get(`/transactions/shipments/${salesOrderId}`);
  },
  create(data: { salesOrderId: string; carrierId: string; trackingNo: string; shippingFee?: number }) {
    return api.post('/transactions/shipments', data);
  },
  createAndForward(data: { salesOrderId: string; carrierId: string; shippingFee?: number; note?: string }) {
    return api.post('/transactions/shipments/create-and-forward', data);
  },
  advanceStep(salesOrderId: string) {
    return api.post(`/transactions/shipments/${salesOrderId}/advance`);
  },
  simulateDelivery(salesOrderId: string) {
    return api.post(`/transactions/shipments/${salesOrderId}/simulate-delivery`);
  },
  confirmReceived(salesOrderId: string) {
    return api.post(`/transactions/shipments/${salesOrderId}/confirm-received`);
  },
  customerReject(salesOrderId: string, reason: string) {
    return api.post(`/transactions/shipments/${salesOrderId}/customer-reject`, { reason });
  },
};

export const reportService = {
  getDashboard() {
    return api.get('/reports/dashboard');
  },
  getInventory(params?: { warehouseId?: string; productId?: string }) {
    return api.get('/reports/inventory', { params });
  },
  getDefectiveInventory() {
    return api.get('/reports/inventory/defective');
  },
  getInbound(params?: { startDate?: string; endDate?: string; warehouseId?: string; productId?: string }) {
    return api.get('/reports/inbound', { params });
  },
  getOutbound(params?: { startDate?: string; endDate?: string; warehouseId?: string; customerId?: string }) {
    return api.get('/reports/outbound', { params });
  },
  getTransactions(params?: { page?: number; limit?: number; warehouseId?: string; productId?: string; transactionType?: string; startDate?: string; endDate?: string }) {
    return api.get('/reports/transactions', { params });
  },
};
