'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Database,
  Plus,
  Search,
  Loader2,
  Edit3,
  Trash2,
  Check,
  X,
  Download,
  Building2,
  DollarSign,
  Calendar,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

interface Comp {
  id: string;
  propertyName: string;
  city: string | null;
  state: string | null;
  assetType: string | null;
  beds: number | null;
  saleDate: string | null;
  salePrice: number | null;
  pricePerBed: number | null;
  capRate: number | null;
  noiAtSale: number | null;
  occupancyAtSale: number | null;
  buyer: string | null;
  seller: string | null;
  broker: string | null;
  source: string | null;
  notes: string | null;
  verified: boolean;
}

interface CompForm {
  propertyName: string;
  city: string;
  state: string;
  assetType: string;
  beds: string;
  saleDate: string;
  salePrice: string;
  capRate: string;
  noiAtSale: string;
  occupancyAtSale: string;
  buyer: string;
  seller: string;
  broker: string;
  source: string;
  notes: string;
}

const EMPTY_FORM: CompForm = {
  propertyName: '', city: '', state: '', assetType: 'SNF', beds: '',
  saleDate: '', salePrice: '', capRate: '', noiAtSale: '', occupancyAtSale: '',
  buyer: '', seller: '', broker: '', source: '', notes: '',
};

export default function CompsPage() {
  const [comps, setComps] = useState<Comp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CompForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState<'saleDate' | 'salePrice' | 'pricePerBed' | 'capRate'>('saleDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchComps = useCallback(async () => {
    try {
      const res = await fetch('/api/comps');
      const json = await res.json();
      if (json.success) setComps(json.data);
    } catch (error) {
      console.error('Failed to fetch comps:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComps(); }, [fetchComps]);

  const handleSave = async () => {
    if (!form.propertyName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        propertyName: form.propertyName,
        city: form.city || null,
        state: form.state || null,
        assetType: form.assetType || null,
        beds: form.beds ? parseInt(form.beds) : null,
        saleDate: form.saleDate || null,
        salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
        capRate: form.capRate ? parseFloat(form.capRate) / 100 : null,
        noiAtSale: form.noiAtSale ? parseFloat(form.noiAtSale) : null,
        occupancyAtSale: form.occupancyAtSale ? parseFloat(form.occupancyAtSale) / 100 : null,
        buyer: form.buyer || null,
        seller: form.seller || null,
        broker: form.broker || null,
        source: form.source || null,
        notes: form.notes || null,
        pricePerBed: form.salePrice && form.beds ? parseFloat(form.salePrice) / parseInt(form.beds) : null,
      };

      const url = editingId ? `/api/comps/${editingId}` : '/api/comps';
      const method = editingId ? 'PATCH' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await fetchComps();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (comp: Comp) => {
    setForm({
      propertyName: comp.propertyName,
      city: comp.city || '',
      state: comp.state || '',
      assetType: comp.assetType || 'SNF',
      beds: comp.beds?.toString() || '',
      saleDate: comp.saleDate || '',
      salePrice: comp.salePrice?.toString() || '',
      capRate: comp.capRate ? (comp.capRate * 100).toFixed(2) : '',
      noiAtSale: comp.noiAtSale?.toString() || '',
      occupancyAtSale: comp.occupancyAtSale ? (comp.occupancyAtSale * 100).toFixed(1) : '',
      buyer: comp.buyer || '',
      seller: comp.seller || '',
      broker: comp.broker || '',
      source: comp.source || '',
      notes: comp.notes || '',
    });
    setEditingId(comp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/comps/${id}`, { method: 'DELETE' });
      await fetchComps();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const filteredComps = comps
    .filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.propertyName.toLowerCase().includes(q) && !c.city?.toLowerCase().includes(q) && !c.buyer?.toLowerCase().includes(q) && !c.seller?.toLowerCase().includes(q)) return false;
      }
      if (filterState && c.state !== filterState) return false;
      if (filterType && c.assetType !== filterType) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

  const states = [...new Set(comps.map(c => c.state).filter(Boolean))].sort();

  const exportCSV = () => {
    const headers = ['Property', 'City', 'State', 'Type', 'Beds', 'Sale Date', 'Sale Price', 'Price/Bed', 'Cap Rate', 'NOI', 'Occupancy', 'Buyer', 'Seller', 'Broker', 'Source'];
    const rows = filteredComps.map(c => [
      `"${c.propertyName}"`, c.city || '', c.state || '', c.assetType || '',
      c.beds || '', c.saleDate || '', c.salePrice || '', c.pricePerBed ? Math.round(c.pricePerBed) : '',
      c.capRate ? (c.capRate * 100).toFixed(2) + '%' : '', c.noiAtSale || '',
      c.occupancyAtSale ? (c.occupancyAtSale * 100).toFixed(1) + '%' : '',
      `"${c.buyer || ''}"`, `"${c.seller || ''}"`, `"${c.broker || ''}"`, c.source || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparable-sales-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  }

  return (
    <div className="py-6 px-4 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-500" />
            Comparable Sales Database
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {comps.length} transaction{comps.length !== 1 ? 's' : ''} — add closed deals to improve comp engine accuracy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
            <Download className="w-3 h-3" /> Export
          </button>
          <button
            onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setEditingId(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-primary-200 dark:border-primary-800 rounded-xl p-5 bg-primary-50/30 dark:bg-primary-900/10 mb-6">
          <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4">
            {editingId ? 'Edit Transaction' : 'Add New Transaction'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'propertyName', label: 'Property Name *', span: 2 },
              { key: 'city', label: 'City' },
              { key: 'state', label: 'State', placeholder: 'OH' },
              { key: 'assetType', label: 'Asset Type', type: 'select', options: ['SNF', 'ALF', 'ILF', 'HOSPICE'] },
              { key: 'beds', label: 'Beds', type: 'number' },
              { key: 'saleDate', label: 'Sale Date', type: 'date' },
              { key: 'salePrice', label: 'Sale Price ($)', type: 'number', placeholder: '5000000' },
              { key: 'capRate', label: 'Cap Rate (%)', type: 'number', placeholder: '12.5' },
              { key: 'noiAtSale', label: 'NOI at Sale ($)', type: 'number' },
              { key: 'occupancyAtSale', label: 'Occupancy (%)', type: 'number', placeholder: '85' },
              { key: 'buyer', label: 'Buyer' },
              { key: 'seller', label: 'Seller' },
              { key: 'broker', label: 'Broker' },
              { key: 'source', label: 'Source' },
              { key: 'notes', label: 'Notes', span: 2 },
            ].map(field => (
              <div key={field.key} className={field.span === 2 ? 'md:col-span-2' : ''}>
                <label className="block text-xs text-surface-500 mb-1">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={(form as unknown as Record<string, string>)[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200"
                  >
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={(form as unknown as Record<string, string>)[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-3 py-2 text-sm text-surface-500 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.propertyName.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search properties..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <select value={filterState} onChange={e => setFilterState(e.target.value)} className="px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200">
          <option value="">All States</option>
          {states.map(s => <option key={s} value={s!}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200">
          <option value="">All Types</option>
          <option value="SNF">SNF</option>
          <option value="ALF">ALF</option>
          <option value="ILF">ILF</option>
          <option value="HOSPICE">Hospice</option>
        </select>
        <span className="text-xs text-surface-400">{filteredComps.length} results</span>
      </div>

      {/* Table */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden bg-white dark:bg-surface-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700">
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-surface-500 uppercase">Property</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-surface-500 uppercase">Location</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase">Type</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase">Beds</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase cursor-pointer hover:text-primary-500" onClick={() => toggleSort('saleDate')}>
                  Date <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-surface-500 uppercase cursor-pointer hover:text-primary-500" onClick={() => toggleSort('salePrice')}>
                  Price <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-surface-500 uppercase cursor-pointer hover:text-primary-500" onClick={() => toggleSort('pricePerBed')}>
                  $/Bed <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase cursor-pointer hover:text-primary-500" onClick={() => toggleSort('capRate')}>
                  Cap <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-surface-500 uppercase">Buyer/Seller</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {filteredComps.map(comp => (
                <tr key={comp.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td className="px-3 py-2 font-medium text-surface-800 dark:text-surface-200">{comp.propertyName}</td>
                  <td className="px-3 py-2 text-surface-500">{[comp.city, comp.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-3 py-2 text-center"><span className="px-1.5 py-0.5 text-[9px] font-bold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded">{comp.assetType || '—'}</span></td>
                  <td className="px-3 py-2 text-center text-surface-700 dark:text-surface-300">{comp.beds || '—'}</td>
                  <td className="px-3 py-2 text-center text-surface-500 text-xs">{comp.saleDate || '—'}</td>
                  <td className="px-3 py-2 text-right font-medium text-surface-700 dark:text-surface-300">{comp.salePrice ? `$${(comp.salePrice / 1000000).toFixed(1)}M` : '—'}</td>
                  <td className="px-3 py-2 text-right text-surface-700 dark:text-surface-300">{comp.pricePerBed ? `$${Math.round(comp.pricePerBed).toLocaleString()}` : '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {comp.capRate ? (
                      <span className={cn('text-xs font-semibold', comp.capRate >= 0.10 ? 'text-emerald-600' : 'text-amber-600')}>
                        {(comp.capRate * 100).toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-surface-500 max-w-32 truncate">{[comp.buyer, comp.seller].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(comp)} className="p-1 text-surface-400 hover:text-primary-500 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDelete(comp.id)} className="p-1 text-surface-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredComps.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-surface-400">No comparable sales found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
