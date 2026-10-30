import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Sparkles, Download, Trash2, FolderPlus, Image as ImageIcon, 
  ShieldCheck, Wand2, Building2, Pill, Layers, Ratio, RefreshCw, Cpu, Bot, ChevronDown, ChevronUp, Star, Globe
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { 
  GeneratedImage, getSavedImages, saveGeneratedImage, 
  deleteGeneratedImage, clearAllImages, generateAIImage 
} from '@/api/imageGen';
import { uploadDocument } from '@/api/files';
import toast from 'react-hot-toast';

const RSQUARE_ID = 'c1111111-1111-1111-1111-111111111111';
const KYP_ID = 'c2222222-2222-2222-2222-222222222222';

const STYLES = [
  'Product Showcase',
  'Photorealistic',
  'Corporate Marketing',
  '3D Render',
  'Minimalist Logo',
  'Infographic & Vector',
];

const RATIOS = [
  { label: '1:1 Square', value: '1:1' },
  { label: '16:9 Landscape', value: '16:9' },
  { label: '4:3 Standard', value: '4:3' },
  { label: '9:16 Vertical', value: '9:16' },
];

const LLM_MODELS = [
  { id: 'qwen2.5:7b', label: 'Qwen 2.5 (7B Local LLM)', tag: 'Recommended' },
  { id: 'gemma3:4b', label: 'Gemma 3 (4B Local LLM)', tag: 'Fast' }
];

export default function AIImageStudioPage() {
  const { activeCompanyId } = useAuthStore();
  const isRSquare = (activeCompanyId || RSQUARE_ID) === RSQUARE_ID;
  const companyName = isRSquare ? 'RSquare Services' : 'KYP Pharma';
  const CompanyIcon = isRSquare ? Building2 : Pill;

  const [prompt, setPrompt] = useState('injection photo with white background');
  const [selectedStyle, setSelectedStyle] = useState('Product Showcase');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [selectedModel, setSelectedModel] = useState('qwen2.5:7b');
  const [engineType, setEngineType] = useState<'studio' | 'horde'>('studio');
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showPromptDetails, setShowPromptDetails] = useState(false);

  useEffect(() => {
    let interval: any;
    if (generating) {
      setElapsed(0);
      interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [generating]);

  useEffect(() => {
    const list = getSavedImages(activeCompanyId || RSQUARE_ID);
    setImages(list);
    if (list.length > 0) {
      setSelectedImage(list[0]);
    } else {
      setSelectedImage(null);
    }
  }, [activeCompanyId]);

  const handleGenerate = async (customPrompt?: string) => {
    const textPrompt = customPrompt || prompt.trim();
    if (!textPrompt) {
      toast.error('Please enter a description for the image.');
      return;
    }

    try {
      setGenerating(true);
      setStatusMessage('Initializing Local LLM...');
      
      const { imageUrl, engine, optimizedPrompt } = await generateAIImage(
        textPrompt, 
        selectedStyle, 
        aspectRatio, 
        companyName,
        selectedModel,
        engineType,
        undefined,
        (status) => setStatusMessage(status)
      );
      
      const newImg: GeneratedImage = {
        id: `img-${Date.now()}`,
        company_id: activeCompanyId || RSQUARE_ID,
        prompt: textPrompt,
        optimized_prompt: optimizedPrompt,
        llm_model: selectedModel,
        style: selectedStyle,
        aspect_ratio: aspectRatio,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        file_name: `${companyName.replace(/\s+/g, '_')}_${Date.now()}.jpg`,
        engine: engine
      };

      saveGeneratedImage(newImg, activeCompanyId || RSQUARE_ID);
      const updated = getSavedImages(activeCompanyId || RSQUARE_ID);
      setImages(updated);
      setSelectedImage(newImg);
      toast.success('Generated professional AI image!');
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || 'Failed to generate image');
    } finally {
      setGenerating(false);
      setStatusMessage('');
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const a = document.createElement('a');
    a.href = img.image_url;
    a.download = img.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download started');
  };

  const handleSaveToDocuments = async (img: GeneratedImage) => {
    try {
      const res = await fetch(img.image_url);
      const blob = await res.blob();
      const file = new File([blob], img.file_name, { type: 'image/jpeg' });

      await uploadDocument(file, 'General', 'ai-generated', activeCompanyId || RSQUARE_ID);
      toast.success(`Saved to ${companyName} File Explorer!`);
    } catch {
      toast.error('Failed to save to company documents');
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this generated image?')) return;
    deleteGeneratedImage(id, activeCompanyId || RSQUARE_ID);
    const updated = getSavedImages(activeCompanyId || RSQUARE_ID);
    setImages(updated);
    if (selectedImage?.id === id) {
      setSelectedImage(updated.length > 0 ? updated[0] : null);
    }
    toast.success('Image deleted');
  };

  const handleClearGallery = () => {
    if (!confirm(`Clear old images from ${companyName} Gallery?`)) return;
    clearAllImages(activeCompanyId || RSQUARE_ID);
    setImages([]);
    setSelectedImage(null);
    toast.success('Gallery cleared');
  };

  const rsquarePresets = [
    "Enterprise Cloud Datacenter & Server Rack 42U with glowing fiber optics",
    "Modern Cybersecurity Shield logo emblem with gradient blue finish",
    "Futuristic Office Dashboard holographic UI layout",
  ];

  const kypPresets = [
    "injection photo with white background",
    "Paracetamol 500mg pharmaceutical blister pack product shot with clean packaging",
    "Certified GMP Laboratory Quality Seal emblem with emerald green glow",
    "Medical supply warehouse distribution logistics banner",
  ];

  const currentPresets = isRSquare ? rsquarePresets : kypPresets;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <Sparkles className="mr-2 h-6 w-6 text-primary" />
              AI Creative & Image Studio
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bot size={13} />
              Ollama LLM + Ultra-Realism 8K Studio
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-1 flex items-center gap-2">
            <CompanyIcon size={14} className="text-primary" />
            Active Entity: <strong className="text-foreground">{companyName}</strong> · Generate pristine commercial photography, product packaging, and enterprise visual assets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Controls */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="border-none shadow-md bg-card/60 backdrop-blur-sm p-5 space-y-4">
            {/* Prompt Input */}
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                Prompt Description
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Describe the image for ${companyName}... e.g. "injection photo with white background"`}
                rows={3}
                className="w-full p-3 rounded-xl bg-background border border-border/80 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Presets */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Quick {companyName} Ideas:
              </p>
              <div className="space-y-1.5">
                {currentPresets.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setPrompt(preset);
                      handleGenerate(preset);
                    }}
                    className="w-full text-left text-xs p-2 rounded-lg bg-muted/50 hover:bg-muted text-foreground/80 hover:text-foreground transition-colors truncate block"
                  >
                    ✨ {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Engine Quality Selector */}
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Star size={13} className="text-amber-400" />
                Image Engine & Realism Quality
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEngineType('studio')}
                  className={`p-2.5 rounded-lg text-xs font-medium transition-all text-left flex flex-col ${
                    engineType === 'studio'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="font-semibold flex items-center gap-1">
                    🌟 Ultra-Realism Studio
                  </span>
                  <span className="text-[10px] opacity-80 mt-0.5">8K Commercial Photography</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEngineType('horde')}
                  className={`p-2.5 rounded-lg text-xs font-medium transition-all text-left flex flex-col ${
                    engineType === 'horde'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="font-semibold flex items-center gap-1">
                    <Globe size={12} /> AI Horde Diffusion
                  </span>
                  <span className="text-[10px] opacity-80 mt-0.5">Live Community Cluster</span>
                </button>
              </div>
            </div>

            {/* LLM Model Selector */}
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Bot size={13} className="text-primary" />
                Prompt Optimization LLM Model
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LLM_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left flex flex-col ${
                      selectedModel === m.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className="text-[10px] opacity-75">{m.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector */}
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Layers size={13} className="text-primary" />
                Visual Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStyle(st)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                      selectedStyle === st
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Ratio size={13} className="text-primary" />
                Aspect Ratio
              </label>
              <div className="grid grid-cols-2 gap-2">
                {RATIOS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setAspectRatio(r.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-center ${
                      aspectRatio === r.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button & Status */}
            <div className="space-y-2 pt-1">
              <Button
                onClick={() => handleGenerate()}
                disabled={generating || !prompt.trim()}
                className="w-full py-5 text-sm font-semibold shadow-md"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                    Synthesizing with AI Model...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Wand2 size={16} />
                    Generate AI Image
                  </span>
                )}
              </Button>
              {generating && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center space-y-1">
                  <p className="text-xs text-primary font-medium animate-pulse">
                    {statusMessage || 'Synthesizing with AI Model...'}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Elapsed: {elapsed}s · {engineType === 'studio' ? '8K Realism rendering...' : 'AI Horde cluster queue'}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Area: Preview & Gallery */}
        <div className="lg:col-span-7 space-y-5">
          {/* Active Preview */}
          <Card className="border-none shadow-md bg-card/60 backdrop-blur-sm p-4 overflow-hidden">
            {selectedImage ? (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-background/80 flex items-center justify-center border border-border/50 max-h-[460px]">
                  <img
                    src={selectedImage.image_url}
                    alt={selectedImage.prompt}
                    className="w-full h-auto object-contain max-h-[440px] rounded-lg shadow-inner"
                  />
                  {selectedImage.engine && (
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md text-[11px] font-medium bg-black/75 backdrop-blur-md text-white border border-white/10 flex items-center gap-1.5 shadow">
                      <Cpu size={12} className="text-emerald-400" />
                      {selectedImage.engine}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                        {selectedImage.prompt}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Style: <strong className="text-foreground">{selectedImage.style}</strong> · Ratio: {selectedImage.aspect_ratio} · {new Date(selectedImage.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleGenerate(selectedImage.prompt)}
                        disabled={generating}
                        className="text-xs h-8"
                        title="Regenerate this prompt with AI"
                      >
                        <RefreshCw size={13} className={`mr-1 text-primary ${generating ? 'animate-spin' : ''}`} />
                        Regenerate
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSaveToDocuments(selectedImage)}
                        className="text-xs h-8"
                      >
                        <FolderPlus size={14} className="mr-1.5 text-primary" />
                        Save to Files
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleDownload(selectedImage)}
                        className="text-xs h-8 shadow-sm"
                      >
                        <Download size={14} className="mr-1.5" />
                        Download
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(selectedImage.id)}
                        className="text-muted-foreground hover:text-red-400 h-8 w-8"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* LLM Prompt Inspection Toggle */}
                  {selectedImage.optimized_prompt && (
                    <div className="pt-2 border-t border-border/40">
                      <button
                        type="button"
                        onClick={() => setShowPromptDetails(!showPromptDetails)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-medium transition-colors"
                      >
                        <Bot size={13} className="text-primary" />
                        <span>LLM Engineered Prompt ({selectedImage.llm_model || 'qwen2.5:7b'})</span>
                        {showPromptDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {showPromptDetails && (
                        <p className="mt-1.5 p-2.5 rounded-lg bg-muted/40 text-xs text-foreground/80 leading-relaxed font-mono border border-border/40">
                          {selectedImage.optimized_prompt}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center flex flex-col items-center justify-center">
                <div className="p-4 rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                  <ImageIcon size={38} />
                </div>
                <h3 className="font-semibold text-sm">No images generated yet for {companyName}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Type a prompt on the left and click Generate AI Image to synthesize your first asset.
                </p>
              </div>
            )}
          </Card>

          {/* Gallery Thumbnails */}
          {images.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  {companyName} Gallery ({images.length})
                </h4>
                <button
                  type="button"
                  onClick={handleClearGallery}
                  className="text-[11px] text-muted-foreground hover:text-red-400 transition-colors"
                >
                  Clear Gallery
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                {images.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`relative aspect-square rounded-lg overflow-hidden border transition-all ${
                      selectedImage?.id === img.id
                        ? 'border-primary ring-2 ring-primary/40 scale-105'
                        : 'border-border/60 hover:border-primary/40 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={img.image_url} alt={img.prompt} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
