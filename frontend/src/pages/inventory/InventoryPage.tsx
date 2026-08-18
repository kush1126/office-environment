import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../../api/inventory';
import { useAuthStore } from '../../store/authStore';
import { InventoryMovement } from '../../types/erp';
import { AdjustStockModal } from './AdjustStockModal';

export default function InventoryPage() {
  const { activeCompanyId } = useAuthStore();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  useEffect(() => {
    if (activeCompanyId) {
      loadMovements();
    }
  }, [activeCompanyId]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      if (activeCompanyId) {
        const response = await inventoryApi.listMovements();
        setMovements(response.items);
      }
    } catch (error) {
      console.error('Failed to load inventory movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'RETURN_IN':
        return 'text-green-600 bg-green-50';
      case 'SALE':
      case 'RETURN_OUT':
        return 'text-red-600 bg-red-50';
      case 'DAMAGE':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Inventory Movements</h1>
        <button 
          onClick={() => setShowAdjustModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          + Adjust Stock
        </button>
      </div>

      <AdjustStockModal 
        open={showAdjustModal} 
        onOpenChange={setShowAdjustModal} 
        onSuccess={loadMovements} 
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading inventory data...</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No inventory movements recorded yet.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 font-medium">
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Product ID (Ref)</th>
                <th className="p-4">Change</th>
                <th className="p-4">Stock After</th>
                <th className="p-4 text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 text-sm text-gray-600">
                    {new Date(movement.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${getMovementColor(movement.movement_type)}`}>
                      {movement.movement_type}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-mono text-gray-600">
                    {movement.product_id.split('-')[0]}...
                  </td>
                  <td className="p-4 font-medium">
                    <span className={movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}>
                      {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                    </span>
                  </td>
                  <td className="p-4 text-gray-800 font-medium">
                    {movement.quantity_after}
                  </td>
                  <td className="p-4 text-right text-xs text-gray-500">
                    {movement.reference_type || '-'} <br/>
                    {movement.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
