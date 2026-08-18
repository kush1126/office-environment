import apiClient from './client';
import { Product, Category } from '../types/erp';
import { PaginatedResponse } from '../types';

export const productApi = {
  // Categories
  listCategories: async () => {
    const { data } = await apiClient.get<Category[]>('/products/categories');
    return data;
  },

  createCategory: async (categoryData: Partial<Category>) => {
    const { data } = await apiClient.post<Category>('/products/categories', categoryData);
    return data;
  },

  updateCategory: async (categoryId: string, categoryData: Partial<Category>) => {
    const { data } = await apiClient.patch<Category>(`/products/categories/${categoryId}`, categoryData);
    return data;
  },

  // Products
  list: async (params?: { page?: number; page_size?: number; search?: string; category_id?: string; is_active?: boolean }) => {
    const { data } = await apiClient.get<PaginatedResponse<Product>>('/products', {
      params
    });
    return data;
  },

  get: async (productId: string) => {
    const { data } = await apiClient.get<Product>(`/products/${productId}`);
    return data;
  },

  create: async (productData: Partial<Product>) => {
    const { data } = await apiClient.post<Product>('/products', productData);
    return data;
  },

  update: async (productId: string, productData: Partial<Product>) => {
    const { data } = await apiClient.patch<Product>(`/products/${productId}`, productData);
    return data;
  },

  delete: async (productId: string) => {
    const { data } = await apiClient.delete(`/products/${productId}`);
    return data;
  }
};
