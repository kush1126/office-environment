import React, { useCallback, useState } from 'react'
import { UploadCloud, Folder, File, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'

export default function BatchUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [category, setCategory] = useState('batch') // 'batch' or 'gst_bill'

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }, [])

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return

    const formData = new FormData()
    Array.from(files).forEach((file) => {
      // In webkit directory uploads, file.webkitRelativePath contains the path
      formData.append('files', file)
    })
    formData.append('category', category)

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const response = await apiClient.post('/files/batch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          )
          setUploadProgress(percentCompleted)
        },
      })
      toast.success(`Successfully uploaded ${response.data.count} items.`)
    } catch (error) {
      toast.error('Batch upload failed.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [category]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
      e.target.value = '' // reset
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">Direct Batch Upload</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload invoices, bills, and products directly. Drag & drop files here or select entire folders.
          </p>
        </div>
        <div className="flex gap-2 bg-muted/50 p-1 rounded-md">
          <button 
            className={`px-3 py-1.5 text-sm rounded-sm transition-all ${category === 'batch' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setCategory('batch')}
          >
            General Files
          </button>
          <button 
            className={`px-3 py-1.5 text-sm rounded-sm transition-all ${category === 'gst_bill' ? 'bg-background shadow-sm font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setCategory('gst_bill')}
          >
            GST Bills
          </button>
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div className="text-sm font-medium">Uploading... {uploadProgress}%</div>
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <UploadCloud size={40} className="text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Drag and drop files or folders here,<br /> or click a button below to select.
            </p>
            <div className="flex gap-4">
              <label className="btn-primary py-2 cursor-pointer flex items-center gap-2 text-sm">
                <File size={16} />
                Select Files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              
              <label className="btn-secondary py-2 cursor-pointer flex items-center gap-2 text-sm">
                <Folder size={16} />
                Select Folder
                <input
                  type="file"
                  // @ts-ignore - webkitdirectory is non-standard but supported
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
