import api from './client';
import { DashboardAnalytics } from '../types/erp';

export const getDashboardAnalytics = async () => {
  const response = await api.get<DashboardAnalytics>('/analytics/dashboard');
  return response.data;
};
