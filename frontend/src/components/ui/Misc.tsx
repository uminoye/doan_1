'use client';
import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export function Card({ children, className, title, action }: CardProps) {
  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
}

export function StatCard({ label, value, icon, color = 'blue' }: StatCardProps) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center border text-2xl', colors[color])}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes: Record<string, string> = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <svg className={clsx('animate-spin text-blue-600', sizes[size])} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const sizes: Record<string, string> = {
    sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={clsx('relative bg-white rounded-xl shadow-xl w-full', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <span className="text-5xl mb-3">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface ProductCardProps {
  product: {
    id: string;
    sku: string;
    name: string;
    category?: string;
    unit: string;
    imageUrl?: string;
    salePrice: number;
    totalOnHand?: number;
    minStock?: number;
    isLowStock?: boolean;
    isOutOfStock?: boolean;
  };
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function ProductCard({ product, onEdit, onDelete, className }: ProductCardProps) {
  const stockQty = product.totalOnHand ?? 0;
  const stockColor = product.isOutOfStock
    ? 'text-red-500'
    : product.isLowStock
    ? 'text-yellow-600'
    : 'text-gray-800';
  const stockBg = product.isOutOfStock
    ? 'bg-red-50'
    : product.isLowStock
    ? 'bg-yellow-50'
    : 'bg-gray-50';

  return (
    <div className={clsx(
      'bg-white rounded-2xl border border-gray-200 overflow-hidden',
      'hover:shadow-md hover:border-gray-300 transition-all duration-200',
      'flex flex-col',
      className
    )}>
      {/* Image */}
      <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-20">📦</span>
          </div>
        )}

        {/* Category badge overlaid on image */}
        {product.category && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm border border-gray-200">
            {product.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Name & SKU */}
        <div className="mb-3">
          <p className="text-xs text-gray-400 font-mono mb-1">{product.sku}</p>
          <h3 className="text-base font-semibold text-gray-800 leading-snug line-clamp-2">
            {product.name}
          </h3>
        </div>

        {/* Price */}
        <div className="mt-auto mb-3">
          <p className="text-lg font-bold text-gray-900">
            {Number(product.salePrice).toLocaleString()} <span className="text-sm font-normal text-gray-500">đ</span>
          </p>
        </div>

        {/* Stock indicator */}
        <div className={clsx('rounded-xl p-3 mb-4', stockBg)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Tồn kho</p>
              <p className={clsx('text-base font-bold mt-0.5', stockColor)}>
                {product.isOutOfStock ? 'Hết hàng' : `${stockQty} ${product.unit}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-medium">Tối thiểu</p>
              <p className="text-base font-bold text-gray-500 mt-0.5">
                {product.minStock ?? 0} <span className="font-normal text-gray-400">{product.unit}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(product)}
            className="flex-1 py-2 px-3 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
          >
            Sửa
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="flex-1 py-2 px-3 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">Tổng {total} bản ghi</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">Trước</button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let p = i + 1;
          if (totalPages > 5) {
            if (page > 3) p = page - 2 + i;
            if (page > totalPages - 2) p = totalPages - 4 + i;
          }
          return (
            <button key={p} onClick={() => onPageChange(p)} className={clsx('px-3 py-1.5 text-sm border rounded-lg', page === p ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50')}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">Sau</button>
      </div>
    </div>
  );
}
