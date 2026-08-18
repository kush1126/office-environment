import apiClient from './client';
import { Warehouse, Inventory, InventoryMovement } from '../types/erp';
import { PaginatedResponse } from '../types';

export const inventoryApi = {
  // Warehouses
  listWarehouses: async () => {
    const { data } = await apiClient.get<Warehouse[]>('/inventory/warehouses');
    return data;
  },

  createWarehouse: async (warehouseData: Partial<Warehouse>) => {
    const { data } = await apiClient.post<Warehouse>('/inventory/warehouses', warehouseData);
    return data;
  },

  updateWarehouse: async (warehouseId: string, warehouseData: Partial<Warehouse>) => {
    const { data } = await apiClient.patch<Warehouse>(`/inventory/warehouses/${warehouseId}`, warehouseData);
    return data;
  },

  // Stock
  getProductStock: async (productId: string, warehouseId?: string) => {
    const { data } = await apiClient.get<Inventory[]>(`/inventory/stock/${productId}`, {
      params: { warehouse_id: warehouseId }
    });
    return data;
  },

  getProductStockLevel: async (productId: string, warehouseId?: string) => {
    const { data } = await apiClient.get<number>(`/inventory/stock-level/${productId}`, {
      params: { warehouse_id: warehouseId }
    });
    return data;
  },

  // Movements
  listMovements: async (params?: { product_id?: string; page?: number; page_size?: number }) => {
    const { data } = await apiClient.get<PaginatedResponse<InventoryMovement>>('/inventory/movements', {
      params
    });
    return data;
  },

  adjustStock: async (adjustmentData: Partial<InventoryMovement>) => {
    const { data } = await apiClient.post<InventoryMovement>('/inventory/movements/adjust', adjustmentData);
    return data;
  }
};
