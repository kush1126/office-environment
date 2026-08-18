import React, { useState, useEffect } from 'react';
import { Payment } from '@/types/erp';
import { getPayments } from '@/api/finance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, IndianRupee, ChevronRight, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreatePaymentModal } from './CreatePaymentModal';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const data = await getPayments(1, 25, search);
        setPayments(data.items);
      } catch (error) {
        console.error('Failed to fetch payments:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const timeout = setTimeout(fetchPayments, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Track incoming customer payments and outgoing vendor payments</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <CreatePaymentModal 
        open={showCreate} 
        onOpenChange={setShowCreate} 
        onSuccess={() => setSearch(search + ' ')} 
      />

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center">
              <IndianRupee className="mr-2 h-5 w-5 text-primary" />
              Payment History
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search payments..." 
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
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <IndianRupee className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No payments found</h3>
              <p>Record a payment to track your cash flow.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Payment #</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        {payment.payment_type === 'IN' ? (
                          <span className="flex items-center text-green-500 font-medium">
                            <ArrowDownRight className="mr-1 h-4 w-4" /> Received
                          </span>
                        ) : (
                          <span className="flex items-center text-orange-500 font-medium">
                            <ArrowUpRight className="mr-1 h-4 w-4" /> Paid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-primary">{payment.payment_number}</td>
                      <td className="px-4 py-3">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{payment.payment_mode}</td>
                      <td className="px-4 py-3 font-medium">₹{payment.amount.toLocaleString()}</td>
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
