import React, { useState, useEffect, useRef } from 'react';
import { Document } from '@/types/erp';
import { getDocuments, uploadDocument, deleteDocument, deleteAllDocuments, classifyDocument } from '@/api/files';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, Search, File as FileIcon, Trash2, Download, Image as ImageIcon, 
  FileText, Folder, Building2, Pill, Sparkles, FolderOpen, ArrowDownToLine, CheckCircle2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

const RSQUARE_ID = 'c1111111-1111-1111-1111-111111111111';
const KYP_ID = 'c2222222-2222-2222-2222-222222222222';

const CATEGORIES = [
  'All Files',
  'GST & Tax Bills',
  'Invoices & Billing',
  'Quotations & Proposals',
  'Purchase Orders',
  'Legal & Contracts',
  'General',
];

export default function DocumentsPage() {
  const { activeCompanyId, setActiveCompany } = useAuthStore();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(activeCompanyId || RSQUARE_ID);
  const isRSquare = selectedCompanyId === RSQUARE_ID;
  const companyName = isRSquare ? 'RSquare Services' : 'KYP Pharma';
  const CompanyIcon = isRSquare ? Building2 : Pill;

  const [selectedCategory, setSelectedCategory] = useState<string>('All Files');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeCompanyId && (activeCompanyId === RSQUARE_ID || activeCompanyId === KYP_ID)) {
      setSelectedCompanyId(activeCompanyId);
    }
  }, [activeCompanyId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await getDocuments(1, 100, search, selectedCompanyId, selectedCategory);
      setDocuments(data.items);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCompanyId, selectedCategory, search]);

  const handleProcessFile = async (file: File) => {
    try {
      setUploading(true);
      const classification = classifyDocument(file.name);
      await uploadDocument(file, classification.category, classification.category, selectedCompanyId);
      toast.success(
        `✨ Auto-classified: "${file.name}" placed into [${classification.category}]`,
        { duration: 4500 }
      );
      fetchDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to process file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      await handleProcessFile(file);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from ${companyName} storage?`)) return;
    try {
      await deleteDocument(id, selectedCompanyId);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete all files in ${companyName} storage?`)) return;
    try {
      await deleteAllDocuments(selectedCompanyId);
      toast.success(`Storage cleared for ${companyName}`);
      fetchDocuments();
    } catch {
      toast.error('Failed to delete files');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-blue-400" />;
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-rose-400" />;
    return <FileIcon className="h-8 w-8 text-gray-400" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Company File Explorer</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              100% Offline · Company Scoped
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Private, isolated file manager for <strong className="text-foreground">{companyName}</strong>. Zero cloud telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleProcessFile(file);
            }}
            className="hidden"
            multiple
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="shadow-sm">
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </Button>

          {documents.length > 0 && (
            <Button variant="outline" onClick={handleDeleteAll} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Company Switcher Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setSelectedCompanyId(RSQUARE_ID);
            setActiveCompany(RSQUARE_ID);
          }}
          className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
            isRSquare
              ? 'bg-card border-primary/50 shadow-md ring-1 ring-primary/40'
              : 'bg-card/40 border-border/60 hover:bg-card/70'
          }`}
        >
          <div className={`p-2.5 rounded-lg ${isRSquare ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Building2 size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">RSquare Services Storage</h3>
            <p className="text-xs text-muted-foreground">Scope: storage/documents/rsquare/</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCompanyId(KYP_ID);
            setActiveCompany(KYP_ID);
          }}
          className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
            !isRSquare
              ? 'bg-card border-primary/50 shadow-md ring-1 ring-primary/40'
              : 'bg-card/40 border-border/60 hover:bg-card/70'
          }`}
        >
          <div className={`p-2.5 rounded-lg ${!isRSquare ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Pill size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">KYP Pharma Storage</h3>
            <p className="text-xs text-muted-foreground">Scope: storage/documents/kyp/</p>
          </div>
        </button>
      </div>

      {/* Drag & Drop Smart Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-border/70 hover:border-primary/50 bg-card/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Sparkles size={24} />
          </div>
          <h3 className="font-semibold text-foreground text-sm">
            Drag & Drop any Document (GST Bill, Invoice, Quotation, PO, Contract)
          </h3>
          <p className="text-xs text-muted-foreground max-w-md">
            Our offline engine will automatically read the document, rename it systematically, and file it into the correct category folder for <strong className="text-foreground">{companyName}</strong>.
          </p>
        </div>
      </div>

      {/* Folder Navigation & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {isSelected ? <FolderOpen size={13} /> : <Folder size={13} />}
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>
      </div>

      {/* Files List / Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-none shadow-md bg-card/40 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="bg-muted p-4 rounded-full mb-3 text-muted-foreground">
              <FolderOpen size={36} />
            </div>
            <h3 className="font-semibold text-foreground text-sm">
              No files in {selectedCategory === 'All Files' ? `${companyName} Storage` : `[${selectedCategory}]`}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Drop files above or click Upload File to store documents securely in this company workspace.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc) => {
            const cat = (doc as any).category || 'General';
            return (
              <Card key={doc.id} className="border-none shadow-sm bg-card/60 hover:bg-card/90 transition-all p-3.5 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted/70 shrink-0">
                  {getFileIcon(doc.mime_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-medium text-xs text-foreground truncate" title={doc.filename}>
                      {doc.filename}
                    </h4>
                    <button
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      className="text-muted-foreground hover:text-red-400 p-1 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {cat}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatBytes(doc.size_bytes || 0)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
