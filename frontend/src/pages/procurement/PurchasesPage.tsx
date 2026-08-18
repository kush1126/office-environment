import React, { useState, useEffect } from 'react';
import { PurchaseOrder } from '@/types/erp';
import { getPurchaseOrders } from '@/api/procurement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, ShoppingCart, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreatePOModal } from './CreatePOModal';

export default function PurchasesPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        setLoading(true);
        const data = await getPurchaseOrders(1, 25, search);
        setPurchaseOrders(data.items);
      } catch (error) {
        console.error('Failed to fetch purchase orders:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const timeout = setTimeout(fetchPOs, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">Manage vendor purchases and procurement</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create PO
        </Button>
      </div>

      <CreatePOModal 
        open={showCreate} 
        onOpenChange={setShowCreate} 
        onSuccess={() => setSearch(search + ' ')} 
      />

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5 text-primary" />
              Recent Purchase Orders
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search POs..." 
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
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No purchase orders found</h3>
              <p>Create a purchase order to procure products from vendors.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">PO #</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Expected Delivery</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3 font-medium text-primary">{po.po_number}</td>
                      <td className="px-4 py-3">{new Date(po.issue_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 font-medium">₹{po.grand_total.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          po.status === 'RECEIVED' ? 'bg-green-500/10 text-green-500' :
                          po.status === 'ISSUED' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-zinc-500/10 text-zinc-500'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          View <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
