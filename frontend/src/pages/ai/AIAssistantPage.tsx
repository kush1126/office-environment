import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChatMessage, getChatHistory, sendChatMessage } from '@/api/ai';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, User as UserIcon, Send, Sparkles, ShieldCheck, Trash2, Cpu, Building2, Pill } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const RSQUARE_ID = 'c1111111-1111-1111-1111-111111111111';
const KYP_ID = 'c2222222-2222-2222-2222-222222222222';

export default function AIAssistantPage() {
  const { user, activeCompanyId } = useAuthStore();
  const isRSquare = (activeCompanyId || RSQUARE_ID) === RSQUARE_ID;
  const companyName = isRSquare ? 'RSquare Services' : 'KYP Pharma';
  const CompanyIcon = isRSquare ? Building2 : Pill;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getChatHistory(activeCompanyId || RSQUARE_ID);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [activeCompanyId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || input.trim();
    if (!promptToSend || sending) return;

    if (!customPrompt) setInput('');
    
    // Optimistic user message
    const optimisticMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      company_id: activeCompanyId || RSQUARE_ID,
      user_id: user?.id || 'admin',
      role: 'user',
      content: promptToSend,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setSending(true);

    try {
      const response = await sendChatMessage(promptToSend, activeCompanyId || RSQUARE_ID);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to communicate with offline LLM');
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = () => {
    if (!confirm(`Clear AI chat history for ${companyName}?`)) return;
    const cid = activeCompanyId || RSQUARE_ID;
    localStorage.removeItem(`office_os_ai_history_${cid}`);
    setMessages([]);
    toast.success(`Chat history cleared for ${companyName}`);
  };

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const bolded = line.split(/(\*\*.*?\*\*)/).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.startsWith('# ')) return <h1 key={idx} className="text-xl font-bold mt-2 mb-1">{bolded}</h1>;
      if (line.startsWith('## ')) return <h2 key={idx} className="text-lg font-bold mt-2 mb-1">{bolded}</h2>;
      if (line.startsWith('### ')) return <h3 key={idx} className="text-base font-semibold mt-1 mb-1">{bolded}</h3>;
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-sm my-0.5">
            {bolded}
          </li>
        );
      }
      return <p key={idx} className="my-1 text-sm leading-relaxed">{bolded}</p>;
    });
  };

  const rsquarePrompts = [
    "Calculate net profit margin on ₹75,000 IT project with 18% GST and ₹28,000 server costs.",
    "Draft a standard SLA and cloud infrastructure proposal for an enterprise customer.",
    "What are the best practices for air-gapped data retention and audit log storage?",
  ];

  const kypPrompts = [
    "Calculate bulk procurement price for 2,000 strips of Paracetamol with 12% GST and 8% distributor discount.",
    "Generate a batch inspection checklist for temperature-sensitive pharmaceutical shipments.",
    "Draft an official vendor supply inquiry for scheduled pharmaceuticals.",
  ];

  const currentPrompts = isRSquare ? rsquarePrompts : kypPrompts;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-primary" />
              Private AI Intelligence Engine
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={13} />
              100% Offline · Air-Gapped
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-1 flex items-center gap-2">
            <CompanyIcon size={14} className="text-primary" />
            Active Entity: <strong className="text-foreground">{companyName}</strong> · Local Brain: <span className="font-mono text-primary font-semibold">Qwen 2.5 (7B)</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/ai/images">
            <Button variant="outline" size="sm" className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/10">
              <Sparkles size={13} className="mr-1.5" />
              AI Image Studio
            </Button>
          </Link>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearHistory} className="text-xs h-8">
              <Trash2 size={13} className="mr-1.5 text-muted-foreground" />
              Clear History
            </Button>
          )}
        </div>
      </div>

      {/* Main Chat Container */}
      <Card className="flex-1 flex flex-col border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden min-h-0">
        <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8">
              <div className="bg-primary/10 p-4 rounded-2xl mb-4 text-primary shadow-glow">
                <Cpu className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold mb-1">
                {companyName} Intelligence Assistant
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
                Powered by a private, local LLM with direct access to your confidential company data. All calculations, data analysis, and answers stay strictly on your local computer.
              </p>

              {/* Sample Prompts */}
              <div className="space-y-2 w-full text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Suggested {companyName} Queries:
                </p>
                {currentPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(undefined, prompt)}
                    className="w-full text-left p-3 rounded-xl bg-card border border-border/70 hover:border-primary/50 hover:bg-card/90 transition-all text-xs text-foreground group flex items-start gap-2 shadow-sm"
                  >
                    <Sparkles size={14} className="text-primary mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex flex-shrink-0 items-center justify-center mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-muted/80 text-foreground border border-border/50 rounded-tl-sm'
                  }`}>
                    {renderContent(msg.content)}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex flex-shrink-0 items-center justify-center mt-1">
                      <UserIcon className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {sending && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted/80 text-muted-foreground border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 text-xs shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                    <span>Local LLM is calculating & reasoning...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>
        
        {/* Input Bar */}
        <div className="p-3.5 border-t border-border/50 bg-background/50 shrink-0">
          <form onSubmit={(e) => handleSend(e)} className="relative flex items-center gap-2">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${companyName} AI a question or request a calculation...`}
              className="pr-12 py-5 rounded-xl bg-card shadow-sm border-border focus-visible:ring-primary text-sm"
              disabled={sending}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || sending}
              className="absolute right-1.5 h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm"
            >
              <Send size={14} />
            </Button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-muted-foreground">
            <span>🔒 Air-gapped: Calculations run 100% locally on your machine.</span>
            <span>Entity: <strong>{companyName}</strong></span>
          </div>
        </div>
      </Card>
    </div>
  );
}
