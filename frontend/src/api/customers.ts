import apiClient from './client';
import { Customer } from '../types/erp';
import { PaginatedResponse } from '../types';

export const customerApi = {
  list: async (params?: { page?: number; page_size?: number; search?: string; is_active?: boolean }) => {
    const { data } = await apiClient.get<PaginatedResponse<Customer>>('/customers', {
      params
    });
    return data;
  },

  get: async (customerId: string) => {
    const { data } = await apiClient.get<Customer>(`/customers/${customerId}`);
    return data;
  },

  create: async (customerData: Partial<Customer>) => {
    const { data } = await apiClient.post<Customer>('/customers', customerData);
    return data;
  },

  update: async (customerId: string, customerData: Partial<Customer>) => {
    const { data } = await apiClient.patch<Customer>(`/customers/${customerId}`, customerData);
    return data;
  },

  delete: async (customerId: string) => {
    const { data } = await apiClient.delete(`/customers/${customerId}`);
    return data;
  }
};
