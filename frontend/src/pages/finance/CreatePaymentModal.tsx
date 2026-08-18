import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPayment } from '@/api/finance';
import { customerApi } from '@/api/customers';
import { vendorApi } from '@/api/vendors';
import { Customer, Vendor } from '@/types/erp';
import toast from 'react-hot-toast';

interface CreatePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePaymentModal({ open, onOpenChange, onSuccess }: CreatePaymentModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [paymentType, setPaymentType] = useState('IN'); // 'IN' or 'OUT'
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [paymentNumber, setPaymentNumber] = useState(`PAY-${Math.floor(1000 + Math.random() * 9000)}`);
  
  useEffect(() => {
    if (open) {
      loadData();
      setPaymentNumber(`PAY-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [custRes, vendRes] = await Promise.all([
        customerApi.list({ page_size: 100 }),
        vendorApi.list({ page_size: 100 })
      ]);
      setCustomers(custRes.items || []);
      setVendors(vendRes.items || []);
      
      if (paymentType === 'IN' && custRes.items?.length > 0) setPartyId(custRes.items[0].id);
      if (paymentType === 'OUT' && vendRes.items?.length > 0) setPartyId(vendRes.items[0].id);
    } catch (error) {
      console.error('Failed to load customers/vendors', error);
      toast.error('Failed to load dependencies');
    }
  };

  useEffect(() => {
    if (paymentType === 'IN' && customers.length > 0 && (!partyId || !customers.find(c => c.id === partyId))) {
      setPartyId(customers[0].id);
    } else if (paymentType === 'OUT' && vendors.length > 0 && (!partyId || !vendors.find(v => v.id === partyId))) {
      setPartyId(vendors[0].id);
    }
  }, [paymentType, customers, vendors, partyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      toast.error('Please select a party.');
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      toast.error('Please enter a valid amount.');
      return;
    }

    try {
      setLoading(true);
      await createPayment({
        payment_type: paymentType,
        customer_id: paymentType === 'IN' ? partyId : undefined,
        vendor_id: paymentType === 'OUT' ? partyId : undefined,
        payment_number: paymentNumber,
        payment_date: new Date().toISOString().split('T')[0],
        amount: Number(amount),
        payment_mode: paymentMode,
      } as any);
      
      toast.success('Payment logged successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to log payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Number</Label>
              <Input value={paymentNumber} onChange={e => setPaymentNumber(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select 
                className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
                value={paymentType} 
                onChange={e => setPaymentType(e.target.value)}
              >
                <option value="IN">Received (In)</option>
                <option value="OUT">Sent (Out)</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>{paymentType === 'IN' ? 'Customer' : 'Vendor'}</Label>
            <select 
              className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
              value={partyId} 
              onChange={e => setPartyId(e.target.value)}
              required
            >
              <option value="" disabled>Select Party</option>
              {paymentType === 'IN' 
                ? customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                : vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
              }
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <select 
                className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
                value={paymentMode} 
                onChange={e => setPaymentMode(e.target.value)}
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Logging...' : 'Log Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
