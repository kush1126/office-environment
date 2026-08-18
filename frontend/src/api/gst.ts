import api from './client';
import { GSTReportResponse } from '../types/erp';

export const getGSTReport = async (startDate: string, endDate: string) => {
  const response = await api.get<GSTReportResponse>('/gst/report', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};
