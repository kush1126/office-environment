import api from './client';
import { Document } from '../types/erp';
import { useAuthStore } from '@/store/authStore';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

const getStorageKey = (companyId?: string) => {
  const cid = companyId || useAuthStore.getState().activeCompanyId || 'default';
  return `office_os_files_${cid}`;
};

export const classifyDocument = (fileName: string): { category: string; suggestedName: string } => {
  const lower = fileName.toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);
  
  if (lower.includes('gst') || lower.includes('tax') || lower.includes('gstr')) {
    return {
      category: 'GST & Tax Bills',
      suggestedName: `GST_${dateStr}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    };
  }
  if (lower.includes('invoice') || lower.includes('inv') || lower.includes('bill')) {
    return {
      category: 'Invoices & Billing',
      suggestedName: `INV_${dateStr}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    };
  }
  if (lower.includes('quote') || lower.includes('quotation') || lower.includes('proposal') || lower.includes('est')) {
    return {
      category: 'Quotations & Proposals',
      suggestedName: `QUOTE_${dateStr}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    };
  }
  if (lower.includes('po') || lower.includes('purchase') || lower.includes('order')) {
    return {
      category: 'Purchase Orders',
      suggestedName: `PO_${dateStr}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    };
  }
  if (lower.includes('contract') || lower.includes('agreement') || lower.includes('nda') || lower.includes('legal')) {
    return {
      category: 'Legal & Contracts',
      suggestedName: `CONTRACT_${dateStr}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    };
  }
  return {
    category: 'General',
    suggestedName: `DOC_${dateStr}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  };
};

export const getDocuments = async (page = 1, pageSize = 50, search = '', companyId?: string, category = ''): Promise<PaginatedResponse<Document>> => {
  try {
    const response = await api.get<PaginatedResponse<Document>>('/files', {
      params: { page, page_size: pageSize, search }
    });
    if (response.data && response.data.items) {
      return response.data;
    }
    throw new Error('No items returned');
  } catch {
    // Isolated local company storage
    const key = getStorageKey(companyId);
    const stored = localStorage.getItem(key);
    let items: Document[] = stored ? JSON.parse(stored) : [];

    if (category && category !== 'All Files') {
      items = items.filter(d => (d as any).category === category);
    }
    if (search) {
      items = items.filter(d => d.filename.toLowerCase().includes(search.toLowerCase()));
    }
    return {
      items,
      total: items.length,
      page: 1,
      page_size: pageSize
    };
  }
};

export const getDocument = async (id: string, companyId?: string): Promise<Document> => {
  try {
    const response = await api.get<Document>(`/files/${id}`);
    return response.data;
  } catch {
    const key = getStorageKey(companyId);
    const stored = localStorage.getItem(key);
    const items: Document[] = stored ? JSON.parse(stored) : [];
    const found = items.find(d => d.id === id);
    if (!found) throw new Error('Document not found');
    return found;
  }
};

export const uploadDocument = async (file: File, category?: string, tags?: string, companyId?: string): Promise<Document> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    if (tags) formData.append('tags', tags);

    const response = await api.post<Document>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch {
    // Local offline storage & smart classification
    const cid = companyId || useAuthStore.getState().activeCompanyId || 'default';
    const classification = classifyDocument(file.name);
    const targetCategory = category || classification.category;
    const targetName = classification.suggestedName;

    const key = getStorageKey(cid);
    const stored = localStorage.getItem(key);
    const items: Document[] = stored ? JSON.parse(stored) : [];

    const newDoc: Document = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `doc-${Date.now()}`,
      company_id: cid,
      filename: targetName,
      file_path: `storage/documents/${cid}/${targetCategory.replace(/[^a-zA-Z0-9]/g, '_')}/${targetName}`,
      mime_type: file.type || 'application/octet-stream',
      file_size_bytes: file.size,
      ocr_status: 'COMPLETED',
      created_at: new Date().toISOString(),
      tags: tags ? tags.split(',') : [targetCategory],
      ...({ category: targetCategory } as any)
    };

    items.unshift(newDoc);
    localStorage.setItem(key, JSON.stringify(items));
    return newDoc;
  }
};

export const deleteDocument = async (id: string, companyId?: string): Promise<void> => {
  try {
    await api.delete(`/files/${id}`);
  } catch {
    const key = getStorageKey(companyId);
    const stored = localStorage.getItem(key);
    if (stored) {
      const items: Document[] = JSON.parse(stored);
      const filtered = items.filter(d => d.id !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  }
};

export const getDocumentDownloadUrl = (id: string) => {
  return `${api.defaults.baseURL}/files/${id}/download`;
};

export const deleteAllDocuments = async (companyId?: string) => {
  try {
    const response = await api.delete('/files/all');
    return response.data;
  } catch {
    const key = getStorageKey(companyId);
    localStorage.removeItem(key);
    return { message: 'All company documents removed successfully.' };
  }
};
