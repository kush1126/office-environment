import api from './client';

export const deployToHostinger = async (domain: string) => {
  const response = await api.post(`/deploy/hostinger?domain=${domain}`);
  return response.data;
};
