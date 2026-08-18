import apiClient from './client';
import { Vendor } from '../types/erp';
import { PaginatedResponse } from '../types';

export const vendorApi = {
  list: async (params?: { page?: number; page_size?: number; search?: string; is_active?: boolean }) => {
    const { data } = await apiClient.get<PaginatedResponse<Vendor>>('/vendors', {
      params
    });
    return data;
  },

  get: async (vendorId: string) => {
    const { data } = await apiClient.get<Vendor>(`/vendors/${vendorId}`);
    return data;
  },

  create: async (vendorData: Partial<Vendor>) => {
    const { data } = await apiClient.post<Vendor>('/vendors', vendorData);
    return data;
  },

  update: async (vendorId: string, vendorData: Partial<Vendor>) => {
    const { data } = await apiClient.patch<Vendor>(`/vendors/${vendorId}`, vendorData);
    return data;
  },

  delete: async (vendorId: string) => {
    const { data } = await apiClient.delete(`/vendors/${vendorId}`);
    return data;
  }
};
