import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface UploadGSTBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UploadGSTBillModal({ open, onOpenChange, onSuccess }: UploadGSTBillModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'gst_bill');
      if (tags) {
        formData.append('tags', tags);
      }

      await apiClient.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('GST Bill uploaded successfully');
      setFile(null);
      setTags('');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to upload GST bill:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to upload GST bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload GST Bill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Bill (PDF/Image) *</Label>
            <Input type="file" accept=".pdf,image/*" onChange={handleFileChange} required />
          </div>
          
          <div className="space-y-2">
            <Label>Tags (Optional)</Label>
            <Input 
              value={tags} 
              onChange={e => setTags(e.target.value)} 
              placeholder="e.g. Q3, Vendor Name, August" 
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Upload Bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
