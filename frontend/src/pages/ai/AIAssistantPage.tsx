import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, getChatHistory, sendChatMessage } from '@/api/ai';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, User as UserIcon, Send, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';

export default function AIAssistantPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const data = await getChatHistory();
        setMessages(data.messages);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    
    // Optimistic UI update
    const optimisticMessage: ChatMessage = {
      id: Date.now().toString(),
      company_id: '',
      user_id: user?.id || '',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setSending(true);

    try {
      const response = await sendChatMessage(userMessage);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error or show error state
    } finally {
      setSending(false);
    }
  };

  const renderContent = (content: string) => {
    // Basic markdown-like rendering for bold text and lists
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const bolded = line.split(/(\*\*.*?\*\*)/).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return <div key={idx} className="min-h-[1.5rem]">{bolded}</div>;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-120px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Sparkles className="mr-2 h-6 w-6 text-primary" />
          AI Assistant
        </h1>
        <p className="text-muted-foreground mt-1">Ask questions about your revenue, inventory, or pending invoices.</p>
      </div>

      <Card className="flex-1 flex flex-col border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">How can I help you today?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                I can analyze your company data. Try asking about your sales, pending bills, or low stock alerts.
              </p>
              <div className="space-y-2 w-full">
                <Button variant="outline" className="w-full justify-start text-left h-auto py-3 px-4 text-sm" onClick={() => setInput("What is my total revenue?")}>
                  "What is my total revenue?"
                </Button>
                <Button variant="outline" className="w-full justify-start text-left h-auto py-3 px-4 text-sm" onClick={() => setInput("Do I have any pending invoices?")}>
                  "Do I have any pending invoices?"
                </Button>
                <Button variant="outline" className="w-full justify-start text-left h-auto py-3 px-4 text-sm" onClick={() => setInput("Which products are low on stock?")}>
                  "Which products are low on stock?"
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-muted/80 text-foreground border border-border/50 rounded-tl-sm'
                  }`}>
                    {renderContent(msg.content)}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex flex-shrink-0 items-center justify-center">
                      <UserIcon className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted/80 text-foreground border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>
        
        <div className="p-4 border-t border-border/50 bg-background/50">
          <form onSubmit={handleSend} className="relative flex items-center">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Assistant..."
              className="pr-12 py-6 rounded-full bg-card shadow-sm border-muted focus-visible:ring-primary"
              disabled={sending}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || sending}
              className="absolute right-2 rounded-full h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground">AI can make mistakes. Please verify important financial data.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
