import api from './client';
import { EmailAccount, EmailMessageResponse } from '../types/erp';

export const getEmailAccounts = async () => {
  const response = await api.get<EmailAccount[]>('/email/accounts');
  return response.data;
};

export const createEmailAccount = async (data: any) => {
  const response = await api.post<EmailAccount>('/email/accounts', data);
  return response.data;
};

export const fetchInbox = async (accountId: string) => {
  const response = await api.get<EmailMessageResponse>(`/email/accounts/${accountId}/inbox`);
  return response.data;
};

export const sendEmail = async (accountId: string, data: any) => {
  const response = await api.post(`/email/accounts/${accountId}/send`, data);
  return response.data;
};
