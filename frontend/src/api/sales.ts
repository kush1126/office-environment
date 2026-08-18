import api from './client';
import { Quotation, Invoice } from '../types/erp';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// --- Quotations ---
export const getQuotations = async (page = 1, pageSize = 25, search = '') => {
  const response = await api.get<PaginatedResponse<Quotation>>('/sales/quotations', {
    params: { page, page_size: pageSize, search }
  });
  return response.data;
};

export const getQuotation = async (id: string) => {
  const response = await api.get<Quotation>(`/sales/quotations/${id}`);
  return response.data;
};

export const createQuotation = async (data: Partial<Quotation>) => {
  const response = await api.post<Quotation>('/sales/quotations', data);
  return response.data;
};

export const updateQuotation = async (id: string, data: Partial<Quotation>) => {
  const response = await api.patch<Quotation>(`/sales/quotations/${id}`, data);
  return response.data;
};


// --- Invoices ---
export const getInvoices = async (page = 1, pageSize = 25, search = '') => {
  const response = await api.get<PaginatedResponse<Invoice>>('/sales/invoices', {
    params: { page, page_size: pageSize, search }
  });
  return response.data;
};

export const getInvoice = async (id: string) => {
  const response = await api.get<Invoice>(`/sales/invoices/${id}`);
  return response.data;
};

export const createInvoice = async (data: Partial<Invoice>) => {
  const response = await api.post<Invoice>('/sales/invoices', data);
  return response.data;
};

export const updateInvoice = async (id: string, data: Partial<Invoice>) => {
  const response = await api.patch<Invoice>(`/sales/invoices/${id}`, data);
  return response.data;
};
