import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { FileText, FileSpreadsheet, FileUp, Users } from 'lucide-react';
import { UploadGSTBillModal } from '@/components/UploadGSTBillModal';

export default function SalesPage() {
  const [showGSTModal, setShowGSTModal] = useState(false);

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-800">Sales Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your quotations, invoices, and billing documents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:border-primary/50 transition-all shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FileSpreadsheet className="mr-2 h-5 w-5 text-blue-600" />
              Invoices
            </CardTitle>
            <CardDescription>Manage sales invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/invoices">
              <Button className="w-full mt-4" variant="outline">View Invoices</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-all shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FileText className="mr-2 h-5 w-5 text-purple-600" />
              Quotations
            </CardTitle>
            <CardDescription>Create & manage quotes</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/quotations">
              <Button className="w-full mt-4" variant="outline">View Quotations</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-all shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-600" />
              Customers
            </CardTitle>
            <CardDescription>Manage customer details</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/customers">
              <Button className="w-full mt-4" variant="outline">View Customers</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-all shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-blue-800">
              <FileUp className="mr-2 h-5 w-5 text-blue-600" />
              Upload GST Bills
            </CardTitle>
            <CardDescription className="text-blue-600/80">Store bills for accounting</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={() => setShowGSTModal(true)}
            >
              Upload Bill
            </Button>
          </CardContent>
        </Card>
      </div>

      <UploadGSTBillModal 
        open={showGSTModal} 
        onOpenChange={setShowGSTModal} 
      />

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/invoices">
            <Button>Create Invoice</Button>
          </Link>
          <Link to="/quotations">
            <Button variant="secondary">Create Quotation</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
