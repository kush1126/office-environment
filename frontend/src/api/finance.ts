import api from './client';
import { Payment, Expense, ExpenseCategory } from '../types/erp';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// --- Payments ---
export const getPayments = async (page = 1, pageSize = 25, search = '') => {
  const response = await api.get<PaginatedResponse<Payment>>('/finance/payments', {
    params: { page, page_size: pageSize, search }
  });
  return response.data;
};

export const createPayment = async (data: Partial<Payment>) => {
  const response = await api.post<Payment>('/finance/payments', data);
  return response.data;
};

// --- Expenses ---
export const getExpenses = async (page = 1, pageSize = 25, search = '') => {
  const response = await api.get<PaginatedResponse<Expense>>('/finance/expenses', {
    params: { page, page_size: pageSize, search }
  });
  return response.data;
};

export const createExpense = async (data: Partial<Expense>) => {
  const response = await api.post<Expense>('/finance/expenses', data);
  return response.data;
};

// --- Expense Categories ---
export const getExpenseCategories = async () => {
  const response = await api.get<ExpenseCategory[]>('/finance/expense-categories');
  return response.data;
};

export const createExpenseCategory = async (data: Partial<ExpenseCategory>) => {
  const response = await api.post<ExpenseCategory>('/finance/expense-categories', data);
  return response.data;
};
