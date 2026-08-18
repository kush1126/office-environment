import React, { useState, useEffect } from 'react';
import { Website } from '@/types/erp';
import { getWebsites } from '@/api/websites';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Server, Activity, Plus, Github, ExternalLink } from 'lucide-react';

import { deployToHostinger } from '@/api/deploy';
import toast from 'react-hot-toast';
import { CreateWebsiteModal } from './CreateWebsiteModal';

export default function WebsiteManagerPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const data = await getWebsites(1, 25);
      setWebsites(data.items);
    } catch (error) {
      console.error('Failed to fetch websites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (websiteId: string, domain: string) => {
    try {
      setDeployingId(websiteId);
      const response = await deployToHostinger(domain);
      toast.success(response.message);
      // Wait a bit and refresh data
      setTimeout(fetchWebsites, 1000);
    } catch (error: any) {
      console.error('Deployment failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to trigger deployment.');
    } finally {
      setDeployingId(null);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Website Manager</h1>
          <p className="text-muted-foreground mt-1">Track and manage deployments for company websites</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Website
        </Button>
      </div>

      <CreateWebsiteModal 
        open={showCreate} 
        onOpenChange={setShowCreate} 
        onSuccess={fetchWebsites} 
      />

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
            <h3 className="text-lg font-medium text-foreground mb-1">No websites configured</h3>
            <p className="text-muted-foreground">Add a website to start tracking its deployments.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {websites.map((website) => (
            <Card key={website.id} className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
              <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl flex items-center">
                      <Globe className="mr-2 h-6 w-6 text-primary" />
                      {website.name}
                    </CardTitle>
                    <a href={`https://${website.domain}`} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline flex items-center mt-1">
                      {website.domain} <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 flex items-center">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                    {website.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex gap-4 mb-6">
                  {website.tech_stack && (
                    <div className="flex items-center text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md">
                      <Activity className="mr-2 h-4 w-4" />
                      {website.tech_stack}
                    </div>
                  )}
                  {website.repository_url && (
                    <a href={website.repository_url} target="_blank" rel="noreferrer" className="flex items-center text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md hover:bg-muted transition-colors">
                      <Github className="mr-2 h-4 w-4" />
                      Repository
                    </a>
                  )}
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold flex items-center">
                      <Server className="mr-2 h-4 w-4" />
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
                  
                  <div className="rounded-md border border-border/50 bg-background/50 overflow-hidden">
                    {website.deployments && website.deployments.length > 0 ? (
                      <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-border/50">
                          {website.deployments.slice(0, 3).map((dep) => (
                            <tr key={dep.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2 font-mono text-xs text-primary">{dep.version}</td>
                              <td className="px-3 py-2 text-muted-foreground">{new Date(dep.deployed_at).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right">
                                <span className={`text-xs font-medium ${dep.status === 'SUCCESS' ? 'text-green-500' : 'text-red-500'}`}>
                                  {dep.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
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
