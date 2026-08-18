import api from './client';

export interface ChatMessage {
  id: string;
  company_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const getChatHistory = async () => {
  const response = await api.get<{ messages: ChatMessage[] }>('/ai/history');
  return response.data;
};

export const sendChatMessage = async (message: string) => {
  const response = await api.post<ChatMessage>('/ai/chat', { message });
  return response.data;
};
