import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPurchaseOrder } from '@/api/procurement';
import { vendorApi } from '@/api/vendors';
import { productApi } from '@/api/products';
import { Vendor, Product } from '@/types/erp';
import toast from 'react-hot-toast';

interface CreatePOModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePOModal({ open, onOpenChange, onSuccess }: CreatePOModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [vendorId, setVendorId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [poNumber, setPoNumber] = useState(`PO-${Math.floor(1000 + Math.random() * 9000)}`);
  
  useEffect(() => {
    if (open) {
      loadData();
      setPoNumber(`PO-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [vendorRes, prodRes] = await Promise.all([
        vendorApi.list({ page_size: 100 }),
        productApi.list({ page_size: 100 })
      ]);
      setVendors(vendorRes.items || []);
      setProducts(prodRes.items || []);
      if (vendorRes.items?.length > 0) setVendorId(vendorRes.items[0].id);
      if (prodRes.items?.length > 0) setProductId(prodRes.items[0].id);
    } catch (error) {
      console.error('Failed to load vendors/products', error);
      toast.error('Failed to load dependencies');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !productId) {
      toast.error('Please select a vendor and a product.');
      return;
    }

    const selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) return;

    try {
      setLoading(true);
      await createPurchaseOrder({
        vendor_id: vendorId,
        po_number: poNumber,
        issue_date: new Date().toISOString().split('T')[0],
        expected_delivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
        status: 'DRAFT',
        items: [
          {
            product_id: productId,
            quantity: Number(quantity),
            unit_price: selectedProduct.price, // in a real app, this might be cost_price
            tax_rate: selectedProduct.tax_rate || 0,
            discount_amount: 0
          }
        ]
      } as any);
      
      toast.success('Purchase Order created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to create PO');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>PO Number</Label>
            <Input value={poNumber} onChange={e => setPoNumber(e.target.value)} required />
          </div>
          
          <div className="space-y-2">
            <Label>Vendor</Label>
            <select 
              className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
              value={vendorId} 
              onChange={e => setVendorId(e.target.value)}
              required
            >
              <option value="" disabled>Select Vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Product / Item</Label>
            <select 
              className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
              value={productId} 
              onChange={e => setProductId(e.target.value)}
              required
            >
              <option value="" disabled>Select Product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create PO'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
