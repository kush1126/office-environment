import api from './client';
import { Document } from '../types/erp';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const getDocuments = async (page = 1, pageSize = 25, search = '') => {
  const response = await api.get<PaginatedResponse<Document>>('/files', {
    params: { page, page_size: pageSize, search }
  });
  return response.data;
};

export const getDocument = async (id: string) => {
  const response = await api.get<Document>(`/files/${id}`);
  return response.data;
};

export const uploadDocument = async (file: File, category?: string, tags?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (category) formData.append('category', category);
  if (tags) formData.append('tags', tags);

  const response = await api.post<Document>('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const deleteDocument = async (id: string) => {
  await api.delete(`/files/${id}`);
};

export const getDocumentDownloadUrl = (id: string) => {
  return `${api.defaults.baseURL}/files/${id}/download`;
};

export const deleteAllDocuments = async () => {
  const response = await api.delete('/files/all');
  return response.data;
};
