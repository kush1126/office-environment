import { useState, useEffect } from 'react';
import { Website } from '@/types/erp';
import { getWebsites, deleteWebsite } from '@/api/websites';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Server, Activity, Plus, Github, ExternalLink, Trash2, Building2, Pill } from 'lucide-react';
import { deployToHostinger } from '@/api/deploy';
import toast from 'react-hot-toast';
import { CreateWebsiteModal } from './CreateWebsiteModal';
import { useAuthStore } from '@/store/authStore';

const RSQUARE_ID = 'c1111111-1111-1111-1111-111111111111';
const KYP_ID = 'c2222222-2222-2222-2222-222222222222';

const COMPANIES = [
  { id: RSQUARE_ID, name: 'RSquare Services', code: 'RSQUARE', icon: Building2, desc: 'IT, Cloud & Software Services' },
  { id: KYP_ID, name: 'KYP Pharma', code: 'KYP', icon: Pill, desc: 'Pharmaceutical & Healthcare Distribution' },
];

export default function WebsiteManagerPage() {
  const { activeCompanyId, setActiveCompany } = useAuthStore();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(activeCompanyId || RSQUARE_ID);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Sync selected company when active company changes in header
  useEffect(() => {
    if (activeCompanyId && (activeCompanyId === RSQUARE_ID || activeCompanyId === KYP_ID)) {
      setSelectedCompanyId(activeCompanyId);
    }
  }, [activeCompanyId]);

  const activeCompany = COMPANIES.find((c) => c.id === selectedCompanyId) || COMPANIES[0];

  const fetchWebsites = async (companyId = selectedCompanyId) => {
    try {
      setLoading(true);
      const data = await getWebsites(1, 50, '', companyId);
      setWebsites(data.items);
    } catch (error) {
      console.error('Failed to fetch websites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites(selectedCompanyId);
  }, [selectedCompanyId]);

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setActiveCompany(companyId);
  };

  const handleDeploy = async (websiteId: string, domain: string) => {
    try {
      setDeployingId(websiteId);
      const response = await deployToHostinger(domain);
      toast.success(response.message);
      setTimeout(() => fetchWebsites(selectedCompanyId), 1000);
    } catch (error: any) {
      console.error('Deployment failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to trigger deployment.');
    } finally {
      setDeployingId(null);
    }
  };

  const handleDelete = async (websiteId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from ${activeCompany.name}?`)) return;
    try {
      await deleteWebsite(websiteId, selectedCompanyId);
      toast.success(`Removed ${name}`);
      fetchWebsites(selectedCompanyId);
    } catch {
      toast.error('Failed to delete website');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Website Manager</h1>
          <p className="text-muted-foreground mt-1">
            Isolated website and deployment management for your business entities.
          </p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Website for {activeCompany.code}
        </Button>
      </div>

      {/* Company Isolation Switcher Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COMPANIES.map((company) => {
          const isSelected = selectedCompanyId === company.id;
          const Icon = company.icon;
          return (
            <button
              key={company.id}
              type="button"
              onClick={() => handleSelectCompany(company.id)}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-4 ${
                isSelected
                  ? 'bg-card border-primary/50 shadow-md ring-1 ring-primary/40'
                  : 'bg-card/40 border-border/60 hover:bg-card/70 hover:border-border'
              }`}
            >
              <div
                className={`p-3 rounded-lg ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-base">{company.name}</h3>
                  {isSelected && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Active Scope
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{company.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Create Website Modal */}
      <CreateWebsiteModal 
        open={showCreate} 
        onOpenChange={setShowCreate} 
        onSuccess={() => fetchWebsites(selectedCompanyId)}
        companyId={selectedCompanyId}
        companyName={activeCompany.name}
      />

      {/* Websites List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : websites.length === 0 ? (
        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No websites configured for {activeCompany.name}
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
              All mock data has been removed. Click below to add the official website or web platform for {activeCompany.name}.
            </p>
            <Button onClick={() => setShowCreate(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Website
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {websites.map((website) => (
            <Card key={website.id} className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center">
                      <Globe className="mr-2 h-5 w-5 text-primary" />
                      {website.name}
                    </CardTitle>
                    <a
                      href={`https://${website.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center mt-1"
                    >
                      {website.domain} <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 flex items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></div>
                      {website.status}
                    </span>
                    <button
                      onClick={() => handleDelete(website.id, website.name)}
                      className="text-muted-foreground hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                      title="Delete website"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-2">
                <div className="flex flex-wrap gap-2 mb-4">
                  {website.tech_stack && (
                    <div className="flex items-center text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                      <Activity className="mr-1.5 h-3.5 w-3.5" />
                      {website.tech_stack}
                    </div>
                  )}
                  {website.repository_url && (
                    <a
                      href={website.repository_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <Github className="mr-1.5 h-3.5 w-3.5" />
                      Repository
                    </a>
                  )}
                </div>

                <div className="mt-auto pt-3 border-t border-border/40">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-semibold flex items-center text-foreground">
                      <Server className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      Recent Deployments
                    </h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => handleDeploy(website.id, website.domain)}
                      disabled={deployingId === website.id}
                    >
                      {deployingId === website.id ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-1 h-3 w-3 border-b-2 border-primary rounded-full"></span>
                          Deploying...
                        </span>
                      ) : (
                        "Log Deployment"
                      )}
                    </Button>
                  </div>
                  
                  <div className="rounded-md border border-border/40 bg-background/40 overflow-hidden">
                    {website.deployments && website.deployments.length > 0 ? (
                      <table className="w-full text-xs text-left">
                        <tbody className="divide-y divide-border/40">
                          {website.deployments.slice(0, 3).map((dep) => (
                            <tr key={dep.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-1.5 font-mono text-primary">{dep.version}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{new Date(dep.deployed_at).toLocaleString()}</td>
                              <td className="px-3 py-1.5 text-right">
                                <span className={`font-medium ${dep.status === 'SUCCESS' ? 'text-green-500' : 'text-red-500'}`}>
                                  {dep.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No deployment history recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
