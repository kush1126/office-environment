import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createEmailAccount } from '@/api/email';
import toast from 'react-hot-toast';

interface AddEmailAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddEmailAccountModal({ open, onOpenChange, onSuccess }: AddEmailAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email_address: 'mauryakush1126@gmail.com', // pre-filled for convenience based on request
    password: '',
    username: 'mauryakush1126@gmail.com',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: type === 'number' ? Number(value) : value };
      if (name === 'email_address') {
        newData.username = value; // Keep username synced with email by default
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email_address || !formData.password) {
      toast.error('Email and Password are required');
      return;
    }

    try {
      setLoading(true);
      await createEmailAccount(formData);
      toast.success('Email account added successfully');
      onSuccess();
      onOpenChange(false);
      setFormData({
        email_address: '',
        password: '',
        username: '',
        imap_host: 'imap.gmail.com',
        imap_port: 993,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 465
      });
    } catch (error: any) {
      console.error('Failed to add email account:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to add email account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure Email Account</DialogTitle>
          <DialogDescription>
            Enter your IMAP/SMTP details. For Gmail, you must use an <b>App Password</b> (2-Step Verification required), not your regular password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input 
              name="email_address" 
              type="email" 
              value={formData.email_address} 
              onChange={handleChange} 
              required 
              placeholder="e.g. user@gmail.com" 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Password (App Password) *</Label>
            <Input 
              name="password" 
              type="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              placeholder="16-character App Password" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IMAP Server</Label>
              <Input name="imap_host" value={formData.imap_host} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label>IMAP Port</Label>
              <Input type="number" name="imap_port" value={formData.imap_port} onChange={handleChange} required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP Server</Label>
              <Input name="smtp_host" value={formData.smtp_host} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label>SMTP Port</Label>
              <Input type="number" name="smtp_port" value={formData.smtp_port} onChange={handleChange} required />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Save Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
