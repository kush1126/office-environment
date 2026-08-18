import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inventoryApi } from '@/api/inventory';
import { productApi } from '@/api/products';
import { Product, Warehouse } from '@/types/erp';
import toast from 'react-hot-toast';

interface AdjustStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdjustStockModal({ open, onOpenChange, onSuccess }: AdjustStockModalProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: '',
    movement_type: 'ADJUSTMENT',
    quantity_change: 0,
    reason: ''
  });

  useEffect(() => {
    if (open) {
      loadDependencies();
    }
  }, [open]);

  const loadDependencies = async () => {
    try {
      const [prodRes, whRes] = await Promise.all([
        productApi.list({ page_size: 100 }),
        inventoryApi.listWarehouses()
      ]);
      setProducts(prodRes.items || []);
      setWarehouses(whRes || []);
      
      setFormData(prev => ({
        ...prev,
        product_id: prodRes.items?.[0]?.id || '',
        warehouse_id: whRes?.[0]?.id || ''
      }));
    } catch (error) {
      console.error('Failed to load products/warehouses', error);
      toast.error('Failed to load dependencies');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'quantity_change' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || !formData.warehouse_id) {
      toast.error('Please select a product and warehouse');
      return;
    }
    if (formData.quantity_change === 0) {
      toast.error('Quantity change cannot be zero');
      return;
    }

    try {
      setLoading(true);
      await inventoryApi.adjustStock(formData);
      toast.success('Stock adjusted successfully');
      onSuccess();
      onOpenChange(false);
      setFormData({
        product_id: products[0]?.id || '',
        warehouse_id: warehouses[0]?.id || '',
        movement_type: 'ADJUSTMENT',
        quantity_change: 0,
        reason: ''
      });
    } catch (error: any) {
      console.error('Failed to adjust stock:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Product *</Label>
            <select 
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              required
              className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
            >
              <option value="" disabled>Select Product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label>Warehouse *</Label>
            <select 
              name="warehouse_id"
              value={formData.warehouse_id}
              onChange={handleChange}
              required
              className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
            >
              <option value="" disabled>Select Warehouse</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <select 
                name="movement_type"
                value={formData.movement_type}
                onChange={handleChange}
                required
                className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="PURCHASE">Purchase (+)</option>
                <option value="SALE">Sale (-)</option>
                <option value="RETURN_IN">Return In (+)</option>
                <option value="RETURN_OUT">Return Out (-)</option>
                <option value="DAMAGE">Damage (-)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Quantity Change *</Label>
              <Input 
                type="number" 
                name="quantity_change" 
                value={formData.quantity_change} 
                onChange={handleChange} 
                required 
                placeholder="e.g. 5 or -2" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Input name="reason" value={formData.reason} onChange={handleChange} placeholder="e.g. Initial stock, Found extra, Damaged" />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
