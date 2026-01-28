'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, PieChart, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostItem {
  id: string;
  name: string;
  amount: number;
  isPercent: boolean;
}

export default function AcquisitionCostBuilderPage() {
  const [purchasePrice, setPurchasePrice] = useState<number>(20000000);

  // Default cost items
  const [closingCosts, setClosingCosts] = useState<CostItem[]>([
    { id: '1', name: 'Title Insurance', amount: 0.5, isPercent: true },
    { id: '2', name: 'Legal Fees', amount: 75000, isPercent: false },
    { id: '3', name: 'Due Diligence', amount: 50000, isPercent: false },
    { id: '4', name: 'Environmental (Phase I/II)', amount: 25000, isPercent: false },
    { id: '5', name: 'Survey', amount: 15000, isPercent: false },
    { id: '6', name: 'Appraisal', amount: 20000, isPercent: false },
    { id: '7', name: 'Lender Fees', amount: 1.0, isPercent: true },
    { id: '8', name: 'Recording & Transfer Tax', amount: 0.5, isPercent: true },
  ]);

  const [capexItems, setCapexItems] = useState<CostItem[]>([
    { id: '1', name: 'Immediate Repairs', amount: 500000, isPercent: false },
    { id: '2', name: 'Deferred Maintenance', amount: 300000, isPercent: false },
    { id: '3', name: 'FF&E Reserve', amount: 200000, isPercent: false },
  ]);

  const [workingCapital, setWorkingCapital] = useState<number>(500000);
  const [operatingReserves, setOperatingReserves] = useState<number>(300000);

  // Calculate totals
  const closingTotal = useMemo(() => {
    return closingCosts.reduce((sum, item) => {
      return sum + (item.isPercent ? purchasePrice * (item.amount / 100) : item.amount);
    }, 0);
  }, [closingCosts, purchasePrice]);

  const capexTotal = useMemo(() => {
    return capexItems.reduce((sum, item) => {
      return sum + (item.isPercent ? purchasePrice * (item.amount / 100) : item.amount);
    }, 0);
  }, [capexItems, purchasePrice]);

  const totalAcquisitionCost = useMemo(() => {
    return purchasePrice + closingTotal + capexTotal + workingCapital + operatingReserves;
  }, [purchasePrice, closingTotal, capexTotal, workingCapital, operatingReserves]);

  const addCostItem = (type: 'closing' | 'capex') => {
    const newItem: CostItem = {
      id: Date.now().toString(),
      name: 'New Item',
      amount: 0,
      isPercent: false,
    };
    if (type === 'closing') {
      setClosingCosts([...closingCosts, newItem]);
    } else {
      setCapexItems([...capexItems, newItem]);
    }
  };

  const updateCostItem = (type: 'closing' | 'capex', id: string, updates: Partial<CostItem>) => {
    const setter = type === 'closing' ? setClosingCosts : setCapexItems;
    const items = type === 'closing' ? closingCosts : capexItems;
    setter(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeCostItem = (type: 'closing' | 'capex', id: string) => {
    const setter = type === 'closing' ? setClosingCosts : setCapexItems;
    const items = type === 'closing' ? closingCosts : capexItems;
    setter(items.filter((item) => item.id !== id));
  };

  // Calculate percentages for pie chart
  const categories = [
    { name: 'Purchase Price', value: purchasePrice, color: 'bg-blue-500' },
    { name: 'Closing Costs', value: closingTotal, color: 'bg-green-500' },
    { name: 'CapEx', value: capexTotal, color: 'bg-amber-500' },
    { name: 'Working Capital', value: workingCapital, color: 'bg-purple-500' },
    { name: 'Op. Reserves', value: operatingReserves, color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/tools" className="neu-button p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Acquisition Cost Builder</h1>
          <p className="text-sm text-surface-500">Total acquisition costs including closing, capex, and working capital</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Purchase Price */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Purchase Price</h3>
            <div className="relative max-w-sm">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="input pl-9 text-lg font-bold"
              />
            </div>
          </div>

          {/* Closing Costs */}
          <div className="neu-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Closing Costs</h3>
              <button onClick={() => addCostItem('closing')} className="neu-button text-xs py-1 px-2 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {closingCosts.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateCostItem('closing', item.id, { name: e.target.value })}
                    className="input flex-1 text-sm"
                  />
                  <input
                    type="number"
                    step={item.isPercent ? 0.1 : 1000}
                    value={item.amount}
                    onChange={(e) => updateCostItem('closing', item.id, { amount: Number(e.target.value) })}
                    className="input w-28 text-sm text-right"
                  />
                  <select
                    value={item.isPercent ? 'percent' : 'fixed'}
                    onChange={(e) => updateCostItem('closing', item.id, { isPercent: e.target.value === 'percent' })}
                    className="input w-20 text-xs"
                  >
                    <option value="fixed">$</option>
                    <option value="percent">%</option>
                  </select>
                  <span className="w-20 text-right text-sm font-medium">
                    ${((item.isPercent ? purchasePrice * (item.amount / 100) : item.amount) / 1000).toFixed(0)}K
                  </span>
                  <button onClick={() => removeCostItem('closing', item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 flex justify-between">
              <span className="font-medium">Total Closing Costs</span>
              <span className="font-bold text-green-600">${(closingTotal / 1000).toFixed(0)}K</span>
            </div>
          </div>

          {/* CapEx */}
          <div className="neu-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Capital Expenditures</h3>
              <button onClick={() => addCostItem('capex')} className="neu-button text-xs py-1 px-2 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {capexItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateCostItem('capex', item.id, { name: e.target.value })}
                    className="input flex-1 text-sm"
                  />
                  <input
                    type="number"
                    step={1000}
                    value={item.amount}
                    onChange={(e) => updateCostItem('capex', item.id, { amount: Number(e.target.value) })}
                    className="input w-32 text-sm text-right"
                  />
                  <button onClick={() => removeCostItem('capex', item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 flex justify-between">
              <span className="font-medium">Total CapEx</span>
              <span className="font-bold text-amber-600">${(capexTotal / 1000).toFixed(0)}K</span>
            </div>
          </div>

          {/* Reserves */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Reserves</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Working Capital</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={workingCapital}
                    onChange={(e) => setWorkingCapital(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Operating Reserves</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={operatingReserves}
                    onChange={(e) => setOperatingReserves(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-4">
          <div className="neu-card p-4 bg-gradient-to-br from-primary-50 to-teal-50 dark:from-primary-900/20 dark:to-teal-900/20">
            <h3 className="text-sm font-semibold mb-3">Total Acquisition Cost</h3>
            <div className="text-3xl font-bold text-primary-600 mb-4">
              ${(totalAcquisitionCost / 1000000).toFixed(2)}M
            </div>

            {/* Breakdown */}
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <span className={cn('w-3 h-3 rounded', cat.color)} />
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <span className="text-sm font-medium">{((cat.value / totalAcquisitionCost) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per Unit Metrics */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Per Unit Analysis</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-surface-500 mb-1">Number of Beds</label>
                <input type="number" defaultValue={120} className="input" id="beds" />
              </div>
              <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Cost per Bed</span>
                  <span className="font-bold">
                    ${Math.round(totalAcquisitionCost / 120).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-surface-500">Closing per Bed</span>
                  <span className="font-medium">${Math.round(closingTotal / 120).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-surface-500">CapEx per Bed</span>
                  <span className="font-medium">${Math.round(capexTotal / 120).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Financing Summary */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Equity Required</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">@ 75% LTV</span>
                <span className="font-medium">${((totalAcquisitionCost * 0.25) / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">@ 70% LTV</span>
                <span className="font-medium">${((totalAcquisitionCost * 0.30) / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">@ 65% LTV</span>
                <span className="font-medium">${((totalAcquisitionCost * 0.35) / 1000000).toFixed(2)}M</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
