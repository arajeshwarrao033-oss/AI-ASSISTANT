import React, { useState } from 'react';
import { Boxes, Plus, Search, Tag, DollarSign } from 'lucide-react';
import { InventoryItem } from '../../types/accounting';
import { api } from '../../services/api';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onRefresh: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ inventory, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    hsnCode: '',
    unit: 'NOS',
    gstRate: 18,
    stockQuantity: 0,
    costPrice: 0,
    sellingPrice: 0,
    active: true,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createInventoryItem(newItem);
      setShowAddModal(false);
      setNewItem({
        name: '',
        sku: '',
        hsnCode: '',
        unit: 'NOS',
        gstRate: 18,
        stockQuantity: 0,
        costPrice: 0,
        sellingPrice: 0,
        active: true,
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create inventory item');
    }
  };

  const filtered = inventory.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      (i.hsnCode || i.hsn || '').includes(search)
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const totalValuation = inventory.reduce(
    (sum, item) => sum + (item.stockQuantity ?? item.currentStock ?? 0) * (item.costPrice ?? item.purchaseRate ?? 0),
    0
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-400" />
            Inventory & HSN Item Master
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Map invoice line items to inventory items with standard HSN codes, UQC units, and tax rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Stock Valuation</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              {formatCurrency(totalValuation)}
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Inventory Item
          </button>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by name, SKU or HSN..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          <span className="text-xs text-slate-400">{filtered.length} Items Listed</span>
        </div>

        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4">Item Name</th>
              <th className="py-2.5 px-3">SKU</th>
              <th className="py-2.5 px-3">HSN Code</th>
              <th className="py-2.5 px-3">Unit</th>
              <th className="py-2.5 px-3 text-center">GST Rate</th>
              <th className="py-2.5 px-3 text-right">In Stock</th>
              <th className="py-2.5 px-3 text-right">Cost Price</th>
              <th className="py-2.5 px-3 text-right">Selling Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 font-semibold text-slate-200">{item.name}</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{item.sku}</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-cyan-400">{item.hsnCode || item.hsn}</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">{item.unit}</td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-300">{item.gstRate}%</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-200 font-bold">
                  {item.stockQuantity ?? item.currentStock}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                  {formatCurrency(item.costPrice ?? item.purchaseRate ?? 0)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                  {formatCurrency(item.sellingPrice ?? item.salesRate ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-400" />
              Add New Inventory Stock Item
            </h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Copper Wire Harness 2.5mm"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">SKU</label>
                  <input
                    type="text"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    placeholder="SKU-COP-001"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">HSN Code *</label>
                  <input
                    type="text"
                    required
                    value={newItem.hsnCode}
                    onChange={(e) => setNewItem({ ...newItem, hsnCode: e.target.value })}
                    placeholder="8544"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Unit (UQC)</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  >
                    <option value="NOS">NOS (Numbers)</option>
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="KGS">KGS (Kilograms)</option>
                    <option value="MTR">MTR (Meters)</option>
                    <option value="BOX">BOX (Boxes)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">GST Rate (%)</label>
                  <select
                    value={newItem.gstRate}
                    onChange={(e) => setNewItem({ ...newItem, gstRate: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={newItem.stockQuantity}
                    onChange={(e) => setNewItem({ ...newItem, stockQuantity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    value={newItem.costPrice}
                    onChange={(e) => setNewItem({ ...newItem, costPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={newItem.sellingPrice}
                    onChange={(e) => setNewItem({ ...newItem, sellingPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
