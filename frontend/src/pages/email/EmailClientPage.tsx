import React, { useState, useEffect, useRef } from 'react';
import { EmailAccount, EmailMessage } from '@/types/erp';
import { getEmailAccounts, fetchInbox } from '@/api/email';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, Search, Edit3, User, Inbox, Send, AlertCircle, RefreshCw, Plus, Menu, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddEmailAccountModal } from './AddEmailAccountModal';
import { ComposeEmailModal } from './ComposeEmailModal';

export default function EmailClientPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar toggle

  // Use a ref to track if we're currently polling to avoid overlapping requests
  const isPollingRef = useRef(false);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await getEmailAccounts();
      setAccounts(data);
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0]);
      }
    } catch (error) {
      console.error('Failed to load email accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadMessages = async (isBackground = false) => {
    if (!selectedAccount || isPollingRef.current) return;
    try {
      if (!isBackground) setRefreshing(true);
      isPollingRef.current = true;
      const data = await fetchInbox(selectedAccount.id);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (!isBackground) setRefreshing(false);
      isPollingRef.current = false;
    }
  };

  useEffect(() => {
    loadMessages();

    // Auto-update every 30 seconds
    const interval = setInterval(() => {
      loadMessages(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedAccount]);

  const handleCompose = () => {
    if (!selectedAccount) alert('Select an email account first');
    else setShowComposeModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center max-w-md mx-auto animate-in fade-in zoom-in duration-500">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <Mail className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">No Email Accounts Configured</h2>
        <p className="text-muted-foreground mb-8">
          You need to add a company email account (IMAP/SMTP) to use the internal mail client.
        </p>
        <Button 
          size="lg" 
          className="shadow-sm transition-all"
          onClick={() => setShowAddModal(true)}
        >
          Configure Email Settings
        </Button>
        <AddEmailAccountModal open={showAddModal} onOpenChange={setShowAddModal} onSuccess={loadAccounts} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Mobile Header with Compose and Menu */}
      <div className="md:hidden flex items-center justify-between bg-card p-3 rounded-lg shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-lg flex-1 text-center">Inbox</span>
        <Button size="icon" onClick={handleCompose} className="rounded-full h-10 w-10 shadow-md">
          <Edit3 className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar - Accounts & Folders */}
      <Card className={`
        ${showSidebar ? 'absolute z-20 inset-y-0 left-0 w-64 flex' : 'hidden'} 
        md:relative md:flex md:w-64 
        border-none shadow-md bg-card flex-col overflow-hidden shrink-0 transition-all duration-300
      `}>
        <div className="p-4 border-b border-border/50">
          <Button 
            className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2" 
            size="default"
            onClick={handleCompose}
          >
            <Edit3 className="h-4 w-4" /> Compose
          </Button>
        </div>
        <div className="p-3 flex-1 overflow-y-auto">
          <div className="space-y-1 mb-8">
            <div className="flex justify-between items-center px-2 mb-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Accounts</h4>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {accounts.map(account => (
              <Button 
                key={account.id}
                variant={selectedAccount?.id === account.id ? "secondary" : "ghost"}
                className={`w-full justify-start text-sm h-9 mb-1 ${selectedAccount?.id === account.id ? 'bg-primary/10 text-primary font-medium hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => {
                  setSelectedAccount(account);
                  setShowSidebar(false);
                }}
              >
                <User className="mr-3 h-4 w-4 opacity-70" />
                <span className="truncate">{account.email_address}</span>
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-muted-foreground px-2 mb-3 uppercase tracking-wider">Folders</h4>
            <Button variant="secondary" className="w-full justify-start text-sm h-9 bg-muted/50 mb-1">
              <Inbox className="mr-3 h-4 w-4 opacity-70" /> Inbox
              <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-medium min-w-[20px] text-center">
                {messages.filter(m => !m.is_read).length}
              </span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm h-9 text-muted-foreground hover:text-foreground mb-1">
              <Send className="mr-3 h-4 w-4 opacity-70" /> Sent
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm h-9 text-muted-foreground hover:text-foreground mb-1">
              <AlertCircle className="mr-3 h-4 w-4 opacity-70" /> Spam
            </Button>
          </div>
        </div>
      </Card>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div 
          className="md:hidden absolute inset-0 bg-background/80 backdrop-blur-sm z-10"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Message List */}
      <Card className={`
        ${selectedMessage ? 'hidden lg:flex' : 'flex'} 
        w-full lg:w-96 xl:w-[400px] border-none shadow-md bg-card flex-col overflow-hidden shrink-0
      `}>
        <div className="p-4 border-b border-border/50 bg-muted/10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Inbox
              {refreshing && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
            </h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background" onClick={() => loadMessages()} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 text-muted-foreground hover:text-foreground ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search emails..." 
              className="pl-9 h-10 bg-background border-border/50 focus-visible:ring-primary shadow-sm text-sm rounded-lg"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !refreshing ? (
            <div className="p-12 text-center flex flex-col items-center justify-center h-full">
              <Inbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">Inbox is empty.</p>
              <p className="text-xs text-muted-foreground mt-1">New emails will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {messages.map(msg => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div 
                    key={msg.id}
                    className={`
                      p-4 cursor-pointer transition-all duration-200 border-l-4
                      ${isSelected ? 'bg-muted/40 border-primary' : 'border-transparent hover:bg-muted/20'} 
                      ${!msg.is_read ? 'bg-primary/[0.03]' : ''}
                    `}
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className={`text-sm truncate pr-3 flex-1 ${!msg.is_read ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                        {msg.sender}
                      </span>
                      <span className={`text-xs shrink-0 ${!msg.is_read ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                        {new Date(msg.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <h4 className={`text-sm mb-1.5 truncate ${!msg.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'}`}>
                      {msg.subject}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {msg.body_snippet}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Reading Pane */}
      <Card className={`
        ${!selectedMessage ? 'hidden lg:flex' : 'flex'} 
        flex-1 border-none shadow-md bg-card flex-col overflow-hidden min-w-0
      `}>
        {selectedMessage ? (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            
            {/* Mobile Back Button (Only visible on small screens when viewing a message) */}
            <div className="lg:hidden p-2 border-b border-border/50 bg-muted/10 flex items-center">
              <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back to Inbox
              </Button>
            </div>

            <div className="p-6 md:p-8 border-b border-border/50 bg-background/50">
              <h2 className="text-2xl font-bold mb-6 text-foreground tracking-tight leading-tight">
                {selectedMessage.subject}
              </h2>
              <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20 shadow-sm">
                    {selectedMessage.sender.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{selectedMessage.sender}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">to {selectedAccount?.email_address}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                  {new Date(selectedMessage.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            </div>
            
            <div className="p-6 md:p-8 flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-loose text-foreground/90 bg-background">
              {selectedMessage.body_snippet}
              <br/><br/>
              <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600/90 text-xs italic">
                Note: This is a truncated MVP preview. Full HTML body parsing requires extended IMAP integration.
              </div>
            </div>
            
            <div className="p-4 md:p-6 border-t border-border/50 bg-muted/10 flex items-center gap-3">
              <Button variant="default" size="sm" className="gap-2 shadow-sm" onClick={() => setShowComposeModal(true)}>
                <Edit3 className="h-4 w-4" /> Reply
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-background hover:bg-muted" onClick={() => setShowComposeModal(true)}>
                <Send className="h-4 w-4" /> Forward
              </Button>
              <div className="flex-1"></div>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-background/50">
            <div className="bg-muted/30 p-6 rounded-full mb-6">
              <Mail className="h-12 w-12 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground/70">No message selected</h3>
            <p className="max-w-xs text-sm">Select a message from the list to read it, or click Compose to start a new conversation.</p>
          </div>
        )}
      </Card>

      <AddEmailAccountModal open={showAddModal} onOpenChange={setShowAddModal} onSuccess={loadAccounts} />
      <ComposeEmailModal open={showComposeModal} onOpenChange={setShowComposeModal} account={selectedAccount} />
    </div>
  );
}
