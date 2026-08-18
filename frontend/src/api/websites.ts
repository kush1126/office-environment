import api from './client';
import { Website, WebsiteDeployment } from '../types/erp';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// --- Websites ---
export const getWebsites = async (page = 1, pageSize = 25, search = '') => {
  const response = await api.get<PaginatedResponse<Website>>('/websites', {
    params: { page, page_size: pageSize, search }
  });
  return response.data;
};

export const getWebsite = async (id: string) => {
  const response = await api.get<Website>(`/websites/${id}`);
  return response.data;
};

export const createWebsite = async (data: Partial<Website>) => {
  const response = await api.post<Website>('/websites', data);
  return response.data;
};

export const updateWebsite = async (id: string, data: Partial<Website>) => {
  const response = await api.patch<Website>(`/websites/${id}`, data);
  return response.data;
};

// --- Deployments ---
export const createDeployment = async (websiteId: string, data: Partial<WebsiteDeployment>) => {
  const response = await api.post<WebsiteDeployment>(`/websites/${websiteId}/deployments`, data);
  return response.data;
};
