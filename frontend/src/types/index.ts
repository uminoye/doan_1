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
  isDefectiveWarehouse?: boolean;
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
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryDate?: string;
  note?: string;
  status: string;
  createdById: string;
  createdBy?: User & { role: { name: string } };
  items: SalesOrderItem[];
  delivery?: DeliveryRequest;
  outboundNote?: StockOutboundNote;
  createdAt: string;
  updatedAt?: string;
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
  isDefective?: boolean;
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
  pending: 'Chờ duyệt',
  submitted: 'Đã gửi',
  logistics_received: 'Logistics tiếp nhận',
  logistics_rejected: 'Bị từ chối',
  logistics_review: 'Logistics xem xét lại',
  warehouse_processing: 'Kho đang xử lý',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  returned: 'Hoàn trả',
  canceled: 'Đã hủy',
};

export const ORDER_STATUS_STEPS = ['pending', 'warehouse_processing', 'shipping', 'completed'];

export const ORDER_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-blue-100 text-blue-700',
  logistics_received: 'bg-indigo-100 text-indigo-700',
  logistics_rejected: 'bg-red-100 text-red-700',
  logistics_review: 'bg-orange-100 text-orange-700',
  warehouse_processing: 'bg-orange-100 text-orange-700',
  warehouse_rejected: 'bg-red-100 text-red-700',
  warehouse_delayed: 'bg-amber-100 text-amber-700',
  shipping: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  returned: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-200 text-gray-500',
  delivery_failed: 'bg-red-100 text-red-700',
};

export const RECEIPT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ NM duyệt',
  PROCESSING: 'NM đang giao',
  REJECTED: 'NM từ chối',
  COMPLETED: 'Hoàn thành',
};

export const RECEIPT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ tiếp nhận',
  received: 'Đã tiếp nhận',
  forwarded: 'Đã chuyển kho',
  logistics_rejected: 'Bị từ chối',
  logistics_review: 'Logistics xem xét lại',
  warehouse_processing: 'Kho đang xử lý',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  returned: 'Hoàn trả',
  canceled: 'Đã hủy',
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  IN: 'Nhập kho',
  OUT: 'Xuất kho',
};

// ===== NEW MODELS FOR DELIVERY PIPELINE =====

export interface Carrier {
  id: string;
  name: string;
  code: string;
  autoPrefix: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Shipment {
  id: string;
  salesOrderId: string;
  carrierId: string;
  carrier?: Carrier;
  trackingNo: string;
  shippingFee: number;
  currentStep: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  customerRejected: boolean;
  rejectionReason?: string;
  salesOrder?: SalesOrder;
}

export interface Notification {
  id: string;
  type: string;
  orderId?: string;
  shipmentId?: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
}

export const SHIPMENT_STEP_LABELS: Record<number, string> = {
  0: 'Kho đang xử lý',
  1: 'Đơn vị vận chuyển đã lấy hàng',
  2: 'Đã đến kho khu vực',
  3: 'Đang trên đường giao đến bạn',
  4: 'Giao thành công',
};

export const ORDER_STATUS_LABELS_V2: Record<string, string> = {
  ...ORDER_STATUS_LABELS,
  warehouse_rejected: 'Kho từ chối',
  warehouse_delayed: 'Dời ngày',
  delivery_failed: 'Lỗi vận chuyển',
};
