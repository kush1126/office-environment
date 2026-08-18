import api from './client';
import { PurchaseOrder, Bill } from '../types/erp';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// --- Purchase Orders ---
export const getPurchaseOrders = async (page = 1, pageSize = 25, search = '') => {
  const response = await api.get<PaginatedResponse<PurchaseOrder>>('/procurement/purchase-orders', {
    params: { page, page_size: pageSize, search }
  });
  return response.data;
};

export const getPurchaseOrder = async (id: string) => {
  const response = await api.get<PurchaseOrder>(`/procurement/purchase-orders/${id}`);
  return response.data;
};

export const createPurchaseOrder = async (data: Partial<PurchaseOrder>) => {
  const response = await api.post<PurchaseOrder>('/procurement/purchase-orders', data);
  return response.data;
};

export const updatePurchaseOrder = async (id: string, data: Partial<PurchaseOrder>) => {
  const response = await api.patch<PurchaseOrder>(`/procurement/purchase-orders/${id}`, data);
  return response.data;
};


// --- Bills ---
export const getBills = async (page = 1, pageSize = 25, search = '') => {
  const response = await api.get<PaginatedResponse<Bill>>('/procurement/bills', {
    params: { page, page_size: pageSize, search }
  });
  return response.data;
};

export const getBill = async (id: string) => {
  const response = await api.get<Bill>(`/procurement/bills/${id}`);
  return response.data;
};

export const createBill = async (data: Partial<Bill>) => {
  const response = await api.post<Bill>('/procurement/bills', data);
  return response.data;
};

export const updateBill = async (id: string, data: Partial<Bill>) => {
  const response = await api.patch<Bill>(`/procurement/bills/${id}`, data);
  return response.data;
};
