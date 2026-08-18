import React, { useState, useEffect } from 'react';
import { Expense } from '@/types/erp';
import { getExpenses } from '@/api/finance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Receipt, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreateExpenseModal } from './CreateExpenseModal';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        const data = await getExpenses(1, 25, search);
        setExpenses(data.items);
      } catch (error) {
        console.error('Failed to fetch expenses:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const timeout = setTimeout(fetchExpenses, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Manage operational costs, utilities, and general expenses</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Log Expense
        </Button>
      </div>

      <CreateExpenseModal 
        open={showCreate} 
        onOpenChange={setShowCreate} 
        onSuccess={() => setSearch(search + ' ')} 
      />

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center">
              <Receipt className="mr-2 h-5 w-5 text-primary" />
              Recent Expenses
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search expenses..." 
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
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Receipt className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No expenses logged</h3>
              <p>Start tracking your company expenses to monitor outflows.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Expense #</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Paid To</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3 font-medium text-primary">{expense.expense_number}</td>
                      <td className="px-4 py-3">{new Date(expense.expense_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{expense.paid_to || '-'}</td>
                      <td className="px-4 py-3">{expense.payment_mode}</td>
                      <td className="px-4 py-3 font-medium">₹{expense.amount.toLocaleString()}</td>
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
