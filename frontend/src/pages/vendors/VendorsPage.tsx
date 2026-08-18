import React, { useState, useEffect } from 'react';
import { vendorApi } from '../../api/vendors';
import { useAuthStore } from '../../store/authStore';
import { Vendor } from '../../types/erp';

export default function VendorsPage() {
  const { activeCompanyId } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (activeCompanyId) {
      loadVendors();
    }
  }, [activeCompanyId]);

  const loadVendors = async () => {
    setLoading(true);
    try {
      if (activeCompanyId) {
        const response = await vendorApi.list({ search });
        setVendors(response.items);
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadVendors();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Vendors</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          + New Vendor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search vendors by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
            <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading vendors...</div>
        ) : vendors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No vendors found.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 font-medium">
                <th className="p-4">Name</th>
                <th className="p-4">Contact Person</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-800">{vendor.name}</div>
                    <div className="text-xs text-gray-500">{vendor.vendor_code || 'No Code'}</div>
                  </td>
                  <td className="p-4 text-gray-600">{vendor.contact_person || '-'}</td>
                  <td className="p-4 text-gray-600">{vendor.phone || '-'}</td>
                  <td className="p-4 text-gray-600">{vendor.email || '-'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      vendor.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
