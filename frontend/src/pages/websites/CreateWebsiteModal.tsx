import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createWebsite } from '@/api/websites';
import toast from 'react-hot-toast';

interface CreateWebsiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyId?: string;
  companyName?: string;
}

export function CreateWebsiteModal({ open, onOpenChange, onSuccess, companyId, companyName }: CreateWebsiteModalProps) {
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [techStack, setTechStack] = useState('React / Node.js');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !domain) {
      toast.error('Please enter a name and domain.');
      return;
    }

    try {
      setLoading(true);
      await createWebsite({
        company_id: companyId,
        name,
        domain,
        tech_stack: techStack,
        repository_url: repositoryUrl,
        status
      } as any);
      
      toast.success(`Website added for ${companyName || 'company'}`);
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setName('');
      setDomain('');
      setTechStack('React / Node.js');
      setRepositoryUrl('');
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to add website');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Website</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Corporate Blog" required />
          </div>

          <div className="space-y-2">
            <Label>Domain URL</Label>
            <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="https://example.com" required />
          </div>

          <div className="space-y-2">
            <Label>Tech Stack</Label>
            <Input value={techStack} onChange={e => setTechStack(e.target.value)} placeholder="e.g. Next.js, WordPress" />
          </div>

          <div className="space-y-2">
            <Label>Repository URL</Label>
            <Input value={repositoryUrl} onChange={e => setRepositoryUrl(e.target.value)} placeholder="https://github.com/org/repo" />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <select 
              className="input w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
              value={status} 
              onChange={e => setStatus(e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Website'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
