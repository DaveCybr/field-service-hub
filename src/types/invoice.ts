// Customer types
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string | null;
  latitude?: number | null; // GPS customer — auto-fill ke service saat buat invoice
  longitude?: number | null;
  maps_url?: string | null; // Link Google Maps (opsional, untuk referensi)
}

// Unit types
export interface Unit {
  id: string;
  qr_code: string;
  unit_type: string;
  brand: string | null;
  model: string | null;
  customer_id?: string;
}

// Product types
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  cost_price: number;
  sell_price: number;
  stock: number;
  is_active: boolean;
}

// Technician/Employee types
export interface Technician {
  id: string;
  name: string;
  status: string;
  role?: string;
}

// Service Item types
export interface ServiceItem {
  id: string;
  title: string;
  description?: string;
  unit_id?: string;
  technician_id?: string;
  scheduled_date?: string;
  service_address?: string;
  service_latitude?: number;
  service_longitude?: number;
  estimated_duration?: number;
  service_cost: number;
  parts_cost: number;
  total_cost: number;
  priority: string;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
}

// Product Item types
export interface ProductItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

// Invoice types
export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  status:
    | "draft"
    | "pending"
    | "in_progress"
    | "completed"
    | "paid"
    | "cancelled";
  payment_status: "unpaid" | "partial" | "paid";
  invoice_date: string;
  due_date?: string;
  services_total: number;
  items_total: number;
  discount: number;
  tax: number;
  grand_total: number;
  amount_paid: number;
  notes?: string;
  admin_notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Invoice with relations
export interface InvoiceWithRelations extends Invoice {
  customer?: Customer;
  created_by_employee?: Technician;
  services?: ServiceItem[];
  items?: ProductItem[];
}

// Form data types
export interface InvoiceFormData {
  customer_id: string;
  discount: string;
  tax: string;
  notes: string;
}

export interface ServiceFormData {
  title: string;
  description?: string;
  unit_id?: string;
  technician_id?: string;
  scheduled_date?: string;
  service_address?: string;
  service_latitude?: number;
  service_longitude?: number;
  estimated_duration?: number;
  service_cost: number;
  priority: "low" | "normal" | "high" | "urgent";
}

export interface ProductFormData {
  product_id: string;
  quantity: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filter types
export interface InvoiceFilters {
  status?: string;
  payment_status?: string;
  customer_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

// Stats types
export interface InvoiceStats {
  total_invoices: number;
  pending_payment: number;
  overdue: number;
  revenue_this_month: number;
}
