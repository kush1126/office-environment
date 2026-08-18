import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createQuotation } from '@/api/sales';
import { customerApi } from '@/api/customers';
import { productApi } from '@/api/products';
import { Customer, Product } from '@/types/erp';
import toast from 'react-hot-toast';

interface CreateQuotationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateQuotationModal({ open, onOpenChange, onSuccess }: CreateQuotationModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [quotationNumber, setQuotationNumber] = useState(`QT-${Math.floor(1000 + Math.random() * 9000)}`);
  
  useEffect(() => {
    if (open) {
      loadData();
      setQuotationNumber(`QT-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        customerApi.list({ page_size: 100 }),
        productApi.list({ page_size: 100 })
      ]);
      setCustomers(custRes.items || []);
      setProducts(prodRes.items || []);
      if (custRes.items?.length > 0) setCustomerId(custRes.items[0].id);
      if (prodRes.items?.length > 0) setProductId(prodRes.items[0].id);
    } catch (error) {
      console.error('Failed to load customers/products', error);
      toast.error('Failed to load dependencies');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !productId) {
      toast.error('Please select a customer and a product.');
      return;
    }

    const selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) return;

    try {
      setLoading(true);
      await createQuotation({
        customer_id: customerId,
        quotation_number: quotationNumber,
        issue_date: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        items: [
          {
            product_id: productId,
            quantity: Number(quantity),
            unit_price: selectedProduct.price,
            tax_rate: selectedProduct.tax_rate || 0,
            discount_amount: 0
          }
        ]
      } as any);
      
      toast.success('Quotation created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to create quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Quotation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quotation Number</Label>
            <Input value={quotationNumber} onChange={e => setQuotationNumber(e.target.value)} required />
          </div>
          
          <div className="space-y-2">
            <Label>Customer</Label>
            <select 
              className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
              value={customerId} 
              onChange={e => setCustomerId(e.target.value)}
              required
            >
              <option value="" disabled>Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Product</Label>
            <select 
              className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
              value={productId} 
              onChange={e => setProductId(e.target.value)}
              required
            >
              <option value="" disabled>Select Product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
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
              {loading ? 'Creating...' : 'Create Quotation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
