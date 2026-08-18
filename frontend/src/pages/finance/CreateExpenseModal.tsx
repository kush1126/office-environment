import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createExpense, getExpenseCategories } from '@/api/finance';
import { ExpenseCategory } from '@/types/erp';
import toast from 'react-hot-toast';

interface CreateExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateExpenseModal({ open, onOpenChange, onSuccess }: CreateExpenseModalProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CARD');
  const [paidTo, setPaidTo] = useState('');
  const [description, setDescription] = useState('');
  const [expenseNumber, setExpenseNumber] = useState(`EXP-${Math.floor(1000 + Math.random() * 9000)}`);
  
  useEffect(() => {
    if (open) {
      loadCategories();
      setExpenseNumber(`EXP-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const cats = await getExpenseCategories();
      setCategories(cats || []);
      if (cats?.length > 0) setCategoryId(cats[0].id);
    } catch (error) {
      console.error('Failed to load categories', error);
      // It's possible the categories API returns empty or fails if none exist, so don't block.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      toast.error('Please select an expense category.');
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      toast.error('Please enter a valid amount.');
      return;
    }

    try {
      setLoading(true);
      await createExpense({
        category_id: categoryId,
        expense_number: expenseNumber,
        expense_date: new Date().toISOString().split('T')[0],
        amount: Number(amount),
        payment_mode: paymentMode,
        paid_to: paidTo,
        description: description
      } as any);
      
      toast.success('Expense logged successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to log expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expense Number</Label>
              <Input value={expenseNumber} onChange={e => setExpenseNumber(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={new Date().toISOString().split('T')[0]} readOnly />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Category</Label>
            {categories.length > 0 ? (
              <select 
                className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
                value={categoryId} 
                onChange={e => setCategoryId(e.target.value)}
                required
              >
                <option value="" disabled>Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <Input placeholder="No categories found. Create one first." disabled />
            )}
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
                <option value="CARD">Card</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Paid To (Vendor/Person)</Label>
            <Input value={paidTo} onChange={e => setPaidTo(e.target.value)} placeholder="E.g., Amazon, Office Supply Co." />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || categories.length === 0}>
              {loading ? 'Logging...' : 'Log Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
