import React, { useState } from 'react';
import { GSTReportResponse } from '@/types/erp';
import { getGSTReport } from '@/api/gst';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, FileText, Calculator, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function GSTReportPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [report, setReport] = useState<GSTReportResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    try {
      setLoading(true);
      const data = await getGSTReport(startDate, endDate);
      setReport(data);
    } catch (error) {
      console.error('Failed to fetch GST report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GST Reports</h1>
          <p className="text-muted-foreground mt-1">Generate GSTR summaries for tax filing</p>
        </div>
        <Button variant="outline" className="shadow-sm">
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>
      </div>

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center">
            <Calculator className="mr-2 h-5 w-5 text-primary" />
            Report Parameters
          </CardTitle>
          <CardDescription>Select the date range to calculate Input and Output tax.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-48 bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-48 bg-background/50"
              />
            </div>
            <Button onClick={generateReport} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-md bg-blue-500/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Sales (Output Tax)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">₹{report.total_sales_tax.toLocaleString()}</div>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1 flex items-center">
                <TrendingUp className="mr-1 h-3 w-3" /> Based on ₹{report.total_sales.toLocaleString()} sales
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-md bg-green-500/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Total Purchases (Input Tax)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">₹{report.total_purchases_tax.toLocaleString()}</div>
              <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1 flex items-center">
                <TrendingDown className="mr-1 h-3 w-3" /> Based on ₹{report.total_purchases.toLocaleString()} purchases
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-purple-500/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-400">Net Tax Payable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">₹{report.net_tax_payable.toLocaleString()}</div>
              <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1 flex items-center">
                <Calculator className="mr-1 h-3 w-3" /> Output Tax - Input Tax
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {report && report.entries.length > 0 && (
        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Detailed Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/50 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Doc #</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Party Name</th>
                    <th className="px-4 py-3 font-medium">GSTIN</th>
                    <th className="px-4 py-3 font-medium text-right">Tax Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {report.entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.document_type === 'INVOICE' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                        }`}>
                          {entry.document_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{entry.document_number}</td>
                      <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{entry.party_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{entry.party_gstin || 'UNREGISTERED'}</td>
                      <td className="px-4 py-3 text-right font-medium">₹{entry.tax_total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
