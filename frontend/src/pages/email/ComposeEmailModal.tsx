import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendEmail } from '@/api/email';
import toast from 'react-hot-toast';
import { EmailAccount } from '@/types/erp';

interface ComposeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: EmailAccount | null;
}

export function ComposeEmailModal({ open, onOpenChange, account }: ComposeEmailModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    to_address: '',
    subject: '',
    body: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      toast.error('No email account selected');
      return;
    }
    if (!formData.to_address || !formData.subject || !formData.body) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await sendEmail(account.id, {
        account_id: account.id,
        ...formData,
        is_html: false
      });
      toast.success('Email sent successfully!');
      onOpenChange(false);
      setFormData({ to_address: '', subject: '', body: '' });
    } catch (error: any) {
      console.error('Failed to send email:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>From</Label>
            <Input value={account?.email_address || 'Loading...'} disabled className="bg-muted" />
          </div>
          
          <div className="space-y-2">
            <Label>To *</Label>
            <Input 
              name="to_address" 
              type="email" 
              value={formData.to_address} 
              onChange={handleChange} 
              required 
              placeholder="recipient@example.com" 
            />
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input 
              name="subject" 
              value={formData.subject} 
              onChange={handleChange} 
              required 
              placeholder="Email subject" 
            />
          </div>

          <div className="space-y-2">
            <Label>Message *</Label>
            <textarea
              name="body"
              value={formData.body}
              onChange={handleChange}
              required
              rows={8}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
              placeholder="Type your message here..."
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !account}>
              {loading ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
