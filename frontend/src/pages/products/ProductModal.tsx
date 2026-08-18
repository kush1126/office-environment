import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { productApi } from '@/api/products';
import { uploadDocument } from '@/api/files';
import { Product, Category } from '@/types/erp';
import toast from 'react-hot-toast';

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product; // If provided, edit mode. Otherwise, add mode.
  onSuccess: () => void;
}

export function ProductModal({ open, onOpenChange, product, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    description: '',
    unit: 'pcs',
    purchase_price: 0,
    selling_price: 0,
    category_id: '',
    is_active: true,
    track_inventory: true,
    image_url: ''
  });

  useEffect(() => {
    if (open) {
      loadCategories();
      if (product) {
        setFormData(product);
      } else {
        setFormData({
          name: '',
          sku: '',
          description: '',
          unit: 'pcs',
          purchase_price: 0,
          selling_price: 0,
          category_id: '',
          is_active: true,
          track_inventory: true,
          image_url: ''
        });
      }
    }
  }, [open, product]);

  const loadCategories = async () => {
    try {
      const data = await productApi.listCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Uploading image...', { id: 'upload' });
      const response = await uploadDocument(file, 'product_images');
      // Set the image_url to point to the download endpoint
      setFormData(prev => ({ ...prev, image_url: `/api/v1/files/${response.id}/download` }));
      toast.success('Image uploaded', { id: 'upload' });
    } catch (error) {
      toast.error('Image upload failed', { id: 'upload' });
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (product) {
        await productApi.update(product.id, formData);
        toast.success('Product updated');
      } else {
        await productApi.create(formData);
        toast.success('Product created');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save product:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'New Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input name="name" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input name="sku" value={formData.sku || ''} onChange={handleChange} placeholder="e.g. ITM-001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <select 
                name="category_id" 
                value={formData.category_id || ''} 
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">No Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Unit of Measure</Label>
              <Input name="unit" value={formData.unit || ''} onChange={handleChange} placeholder="pcs, kg, box..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Purchase Price (₹)</Label>
              <Input type="number" step="0.01" name="purchase_price" value={formData.purchase_price || 0} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Selling Price (₹)</Label>
              <Input type="number" step="0.01" name="selling_price" value={formData.selling_price || 0} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label>Product Image</Label>
            <div className="flex items-center gap-4">
              {formData.image_url && (
                <img src={formData.image_url} alt="Product" className="h-16 w-16 object-cover rounded-md border" />
              )}
              <Input type="file" accept="image/*" onChange={handleImageUpload} className="flex-1" />
            </div>
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
              Active Product
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="track_inventory" checked={formData.track_inventory} onChange={handleChange} />
              Track Inventory
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
