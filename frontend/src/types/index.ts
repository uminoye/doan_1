export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  roleId: string;
  status?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  warehouseCode: string;
  name: string;
  location?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  category?: string;
  salePrice: number;
  imageUrl?: string;
  minStock: number;
  createdAt: string;
  // Enriched fields (from API)
  stockByWarehouse?: Record<string, {
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    onHandQty: number;
    reservedQty: number;
    availableQty: number;
  }>;
  totalOnHand?: number;
  totalReserved?: number;
  totalAvailable?: number;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
}

export interface Category {
  id: string;
  categoryCode: string;
  name: string;
  createdAt: string;
}

export interface ProductionReceipt {
  id: string;
  receiptNo: string;
  warehouseId: string;
  warehouse?: Warehouse;
  receiptDate: string;
  note?: string;
  status: string;
  createdById: string;
  createdBy?: User & { role: { name: string } };
  items: ProductionReceiptItem[];
  createdAt: string;
}

export interface ProductionReceiptItem {
  id: string;
  receiptId: string;
  productId: string;
  product?: Product;
  quantity: number;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  customerId: string;
  customer?: Customer;
  orderDate: string;
  deliveryDate?: string;
  note?: string;
  status: string;
  createdById: string;
  createdBy?: User & { role: { name: string } };
  items: SalesOrderItem[];
  delivery?: DeliveryRequest;
  outboundNote?: StockOutboundNote;
  createdAt: string;
}

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
}

export interface DeliveryRequest {
  id: string;
  salesOrderId: string;
  receivedBy?: string;
  receivedAt?: string;
  note?: string;
  status: string;
  salesOrder?: SalesOrder;
  createdAt: string;
}

export interface StockOutboundNote {
  id: string;
  noteNo: string;
  salesOrderId: string;
  warehouseId: string;
  warehouse?: Warehouse;
  exportDate: string;
  note?: string;
  status: string;
  createdById: string;
  createdBy?: User & { role: { name: string } };
  salesOrder?: SalesOrder;
  items: StockOutboundItem[];
  createdAt: string;
}

export interface StockOutboundItem {
  id: string;
  outboundNoteId: string;
  productId: string;
  product?: Product;
  quantity: number;
}

export interface InventoryBalance {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  category?: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
}

export interface InventoryTransaction {
  id: string;
  date: string;
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productSku: string;
  productName: string;
  type: string;
  quantity: number;
  referenceType: string;
  referenceId: string;
  note?: string;
}

export interface DashboardStats {
  totals: {
    products: number;
    customers: number;
    warehouses: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalInbound: number;
    totalOutbound: number;
    totalBalance: number;
  };
  recentOrders: Array<{
    id: string;
    orderNo: string;
    customerName: string;
    status: string;
    orderDate: string;
    createdBy: string;
  }>;
  recentInbound: Array<{
    id: string;
    receiptNo: string;
    warehouseName: string;
    totalItems: number;
    receiptDate: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  submitted: 'Đã gửi',
  logistics_received: 'Logistics tiếp nhận',
  warehouse_processing: 'Kho đang xử lý',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const ORDER_STATUS_STEPS = ['draft', 'submitted', 'logistics_received', 'warehouse_processing', 'completed'];

export const RECEIPT_STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ tiếp nhận',
  received: 'Đã tiếp nhận',
  forwarded: 'Đã chuyển kho',
  cancelled: 'Đã hủy',
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  IN: 'Nhập kho',
  OUT: 'Xuất kho',
};
