import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { customerApi } from '@/api/customers';
import toast from 'react-hot-toast';

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCustomerModal({ open, onOpenChange, onSuccess }: AddCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contact_person: '',
    customer_code: '',
    gstin: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Customer name is required');
      return;
    }

    try {
      setLoading(true);
      await customerApi.create(formData);
      toast.success('Customer added successfully');
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        contact_person: '',
        customer_code: '',
        gstin: ''
      });
    } catch (error: any) {
      console.error('Failed to add customer:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Customer Name *</Label>
            <Input name="name" value={formData.name} onChange={handleChange} required placeholder="Enter company or person name" />
          </div>
          <div className="space-y-2">
            <Label>Contact Person</Label>
            <Input name="contact_person" value={formData.contact_person} onChange={handleChange} placeholder="e.g. John Doe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1234567890" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Code</Label>
              <Input name="customer_code" value={formData.customer_code} onChange={handleChange} placeholder="CUST-001" />
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input name="gstin" value={formData.gstin} onChange={handleChange} placeholder="22AAAAA0000A1Z5" />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
