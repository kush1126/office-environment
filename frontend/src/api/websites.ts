import api from './client';
import { Website, WebsiteDeployment } from '../types/erp';
import { useAuthStore } from '@/store/authStore';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

const getStorageKey = (companyId?: string) => {
  const cid = companyId || useAuthStore.getState().activeCompanyId || 'default';
  return `office_os_websites_${cid}`;
};

export const getWebsites = async (page = 1, pageSize = 25, search = '', companyId?: string): Promise<PaginatedResponse<Website>> => {
  try {
    const response = await api.get<PaginatedResponse<Website>>('/websites', {
      params: { page, page_size: pageSize, search }
    });
    return response.data;
  } catch {
    // Isolated local company storage (offline fallback, zero mock data)
    const key = getStorageKey(companyId);
    const stored = localStorage.getItem(key);
    let items: Website[] = stored ? JSON.parse(stored) : [];
    if (search) {
      items = items.filter(w => 
        w.name.toLowerCase().includes(search.toLowerCase()) || 
        w.domain.toLowerCase().includes(search.toLowerCase())
      );
    }
    return {
      items,
      total: items.length,
      page: 1,
      page_size: pageSize
    };
  }
};

export const getWebsite = async (id: string): Promise<Website> => {
  try {
    const response = await api.get<Website>(`/websites/${id}`);
    return response.data;
  } catch {
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    const items: Website[] = stored ? JSON.parse(stored) : [];
    const found = items.find(w => w.id === id);
    if (!found) throw new Error('Website not found');
    return found;
  }
};

export const createWebsite = async (data: Partial<Website>): Promise<Website> => {
  try {
    const response = await api.post<Website>('/websites', data);
    return response.data;
  } catch {
    const companyId = (data as any).company_id || useAuthStore.getState().activeCompanyId || 'default';
    const key = `office_os_websites_${companyId}`;
    const stored = localStorage.getItem(key);
    const items: Website[] = stored ? JSON.parse(stored) : [];
    const newWebsite: Website = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `web-${Date.now()}`,
      company_id: companyId,
      name: data.name || 'Untitled Website',
      domain: data.domain || '',
      tech_stack: data.tech_stack || 'React / Node.js',
      repository_url: data.repository_url || '',
      status: (data.status as any) || 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deployments: []
    };
    items.unshift(newWebsite);
    localStorage.setItem(key, JSON.stringify(items));
    return newWebsite;
  }
};

export const deleteWebsite = async (id: string, companyId?: string): Promise<void> => {
  try {
    await api.delete(`/websites/${id}`);
  } catch {
    const key = getStorageKey(companyId);
    const stored = localStorage.getItem(key);
    if (stored) {
      const items: Website[] = JSON.parse(stored);
      const filtered = items.filter(w => w.id !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  }
};

export const updateWebsite = async (id: string, data: Partial<Website>): Promise<Website> => {
  try {
    const response = await api.patch<Website>(`/websites/${id}`, data);
    return response.data;
  } catch {
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    const items: Website[] = stored ? JSON.parse(stored) : [];
    const index = items.findIndex(w => w.id === id);
    if (index >= 0) {
      items[index] = { ...items[index], ...data, updated_at: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(items));
      return items[index];
    }
    throw new Error('Website not found');
  }
};

export const createDeployment = async (websiteId: string, data: Partial<WebsiteDeployment>): Promise<WebsiteDeployment> => {
  try {
    const response = await api.post<WebsiteDeployment>(`/websites/${websiteId}/deployments`, data);
    return response.data;
  } catch {
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    const items: Website[] = stored ? JSON.parse(stored) : [];
    const website = items.find(w => w.id === websiteId);
    const newDep: WebsiteDeployment = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dep-${Date.now()}`,
      website_id: websiteId,
      version: data.version || `v1.0.${Date.now().toString().slice(-3)}`,
      environment: data.environment || 'PRODUCTION',
      status: 'SUCCESS',
      deployed_at: new Date().toISOString()
    };
    if (website) {
      website.deployments = [newDep, ...(website.deployments || [])];
      localStorage.setItem(key, JSON.stringify(items));
    }
    return newDep;
  }
};
