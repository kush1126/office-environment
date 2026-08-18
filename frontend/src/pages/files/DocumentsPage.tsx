import React, { useState, useEffect, useRef } from 'react';
import { Document } from '@/types/erp';
import { getDocuments, uploadDocument, deleteDocument, getDocumentDownloadUrl, deleteAllDocuments } from '@/api/files';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Search, File as FileIcon, Trash2, Download, Image as ImageIcon, FileText, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await getDocuments(1, 50, search);
      setDocuments(data.items);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(fetchDocuments, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadDocument(file, "General");
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDocument(id);
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete ALL files?')) return;
    if (!confirm('WARNING: This action is completely irreversible. Are you absolutely sure you want to permanently delete ALL files?')) return;
    
    try {
      const result = await deleteAllDocuments();
      toast.success(result.message || 'All files deleted successfully.');
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to delete all documents:', error);
      toast.error('Failed to delete all documents.');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-10 w-10 text-blue-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-10 w-10 text-red-500" />;
    return <FileIcon className="h-10 w-10 text-gray-500" />;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Manager</h1>
          <p className="text-muted-foreground mt-1">Securely store and manage company documents</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDeleteAll}
            disabled={documents.length === 0}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Delete All
          </Button>
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
          />
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload File
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">All Files</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search files..." 
                className="pl-9 bg-background/50 border-muted focus-visible:ring-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No files found</h3>
              <p>Upload a document to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="group relative rounded-xl border border-border/50 bg-background/50 p-4 hover:border-primary/50 transition-all hover:shadow-md">
                  <div className="flex justify-center py-6">
                    {getFileIcon(doc.mime_type)}
                  </div>
                  <div className="mt-2">
                    <h4 className="font-medium text-sm truncate" title={doc.original_name}>{doc.original_name}</h4>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground">{formatBytes(doc.size_bytes)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {/* Hover Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 bg-background/80 backdrop-blur-sm rounded-md p-1 border border-border/50">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10" onClick={() => window.open(getDocumentDownloadUrl(doc.id), '_blank')}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
