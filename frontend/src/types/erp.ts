export interface Customer {
  id: string;
  company_id: string;
  customer_code?: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  credit_limit?: number;
  payment_terms_days: number;
  is_active: boolean;
  notes?: string;
}

export interface Vendor {
  id: string;
  company_id: string;
  vendor_code?: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  payment_terms_days: number;
  lead_time_days?: number;
  is_active: boolean;
  notes?: string;
}

export interface Category {
  id: string;
  company_id: string;
  name: string;
  parent_id?: string;
  description?: string;
}

export interface Product {
  id: string;
  company_id: string;
  sku?: string;
  name: string;
  category_id?: string;
  description?: string;
  unit?: string;
  purchase_price?: number;
  avg_purchase_price?: number;
  selling_price?: number;
  gst_rate?: number;
  hsn_sac_code?: string;
  primary_vendor_id?: string;
  is_active: boolean;
  track_inventory: boolean;
  has_batches: boolean;
  has_expiry: boolean;
  has_serial_numbers: boolean;
  image_url?: string;
  min_stock?: number;
  max_stock?: number;
  reorder_level?: number;
}

export interface Warehouse {
  id: string;
  company_id: string;
  name: string;
  address?: string;
  is_default: boolean;
  is_active: boolean;
}

export interface Inventory {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;
  batch_number?: string;
  expiry_date?: string;
  serial_number?: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id: string;
  movement_type: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reference_type?: string;
  reference_id?: string;
  batch_number?: string;
  serial_number?: string;
  reason?: string;
  created_by?: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

// --- Sales ---
export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
}

export interface Quotation {
  id: string;
  company_id: string;
  customer_id: string;
  quotation_number: string;
  issue_date: string;
  valid_until?: string;
  status: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  notes?: string;
  terms_conditions?: string;
  created_by?: string;
  items: QuotationItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  quotation_id?: string;
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  status: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  amount_paid: number;
  notes?: string;
  terms_conditions?: string;
  created_by?: string;
  items: InvoiceItem[];
}

// --- Procurement ---
export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  company_id: string;
  vendor_id: string;
  po_number: string;
  issue_date: string;
  expected_delivery?: string;
  status: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  notes?: string;
  terms_conditions?: string;
  created_by?: string;
  items: PurchaseOrderItem[];
}

export interface BillItem {
  id: string;
  bill_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
}

export interface Bill {
  id: string;
  company_id: string;
  vendor_id: string;
  po_id?: string;
  bill_number: string;
  issue_date: string;
  due_date?: string;
  status: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  amount_paid: number;
  notes?: string;
  terms_conditions?: string;
  created_by?: string;
  items: BillItem[];
}

// --- Finance ---
export interface Payment {
  id: string;
  company_id: string;
  payment_type: 'IN' | 'OUT';
  customer_id?: string;
  vendor_id?: string;
  invoice_id?: string;
  bill_id?: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
}

export interface ExpenseCategory {
  id: string;
  company_id: string;
  name: string;
  description?: string;
}

export interface Expense {
  id: string;
  company_id: string;
  category_id: string;
  expense_number: string;
  expense_date: string;
  amount: number;
  paid_to?: string;
  payment_mode: string;
  reference_number?: string;
  description?: string;
  receipt_path?: string;
  created_by?: string;
}

export interface GSTReportEntry {
  document_type: 'INVOICE' | 'BILL';
  document_number: string;
  date: string;
  party_name: string;
  party_gstin?: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
}

export interface GSTReportResponse {
  company_id: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  total_sales_tax: number;
  total_purchases: number;
  total_purchases_tax: number;
  net_tax_payable: number;
  entries: GSTReportEntry[];
}

// --- Files ---
export interface Document {
  id: string;
  company_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  category?: string;
  tags?: string;
  uploaded_by?: string;
  created_at: string;
}

// --- Websites ---
export interface WebsiteDeployment {
  id: string;
  website_id: string;
  version: string;
  status: string;
  notes?: string;
  deployed_at: string;
  deployed_by?: string;
}

export interface Website {
  id: string;
  company_id: string;
  name: string;
  domain: string;
  tech_stack?: string;
  repository_url?: string;
  status: string;
  deployments: WebsiteDeployment[];
}

// --- Email ---
export interface EmailAccount {
  id: string;
  company_id: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  smtp_host: string;
  smtp_port: number;
  username: string;
}

export interface EmailMessage {
  id: string;
  subject: string;
  sender: string;
  date: string;
  body_snippet: string;
  is_read: boolean;
}

export interface EmailMessageResponse {
  account_id: string;
  messages: EmailMessage[];
}

// --- Analytics ---
export interface SalesAnalytics {
  total_revenue_mtd: number;
  total_revenue_ytd: number;
  pending_invoices_count: number;
  pending_invoices_amount: number;
}

export interface ProcurementAnalytics {
  total_expenses_mtd: number;
  total_expenses_ytd: number;
  pending_bills_count: number;
  pending_bills_amount: number;
}

export interface InventoryAlert {
  product_id: string;
  product_name: string;
  current_quantity: number;
  reorder_point: number;
}

export interface DashboardAnalytics {
  company_id: string;
  date_generated: string;
  sales: SalesAnalytics;
  procurement: ProcurementAnalytics;
  inventory_alerts: InventoryAlert[];
}
