import React, { useState, useEffect } from 'react';
import { productApi } from '../../api/products';
import { useAuthStore } from '../../store/authStore';
import { Product } from '../../types/erp';
import { ProductModal } from './ProductModal';

export default function ProductsPage() {
  const { activeCompanyId } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();

  useEffect(() => {
    if (activeCompanyId) {
      loadProducts();
    }
  }, [activeCompanyId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      if (activeCompanyId) {
        const response = await productApi.list({ search });
        setProducts(response.items);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Products & Catalog</h1>
        <button 
          onClick={() => { setSelectedProduct(undefined); setIsModalOpen(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          + New Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by SKU, name, description..."
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
          <div className="p-8 text-center text-gray-500">Loading catalog...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No products found.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 font-medium">
                <th className="p-4">Product Info</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Pricing</th>
                <th className="p-4">Settings</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-10 w-10 rounded-md object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-gray-100 border flex items-center justify-center text-gray-400 text-xs">No img</div>
                      )}
                      <div className="font-medium text-gray-800">{product.name}</div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 font-mono text-sm">{product.sku || '-'}</td>
                  <td className="p-4 text-gray-600">
                    <div className="text-sm">Buy: ₹{product.purchase_price || 0}</div>
                    <div className="text-sm text-blue-600">Sell: ₹{product.selling_price || 0}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap w-32">
                      {product.track_inventory && <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Inv</span>}
                      {product.has_batches && <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Batch</span>}
                      {product.has_serial_numbers && <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">Serial</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => { setSelectedProduct(product); setIsModalOpen(true); }}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ProductModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        product={selectedProduct} 
        onSuccess={loadProducts} 
      />
    </div>
  );
}
