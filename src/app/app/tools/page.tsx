'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Calculator,
  FileSpreadsheet,
  LogOut,
  Layers,
  Scale,
  FileText,
  TrendingUp,
  Building2,
  DollarSign,
  ArrowRight,
  Star,
  Percent,
  PieChart,
  BarChart3,
  RefreshCw,
  Coins,
  Activity,
  ClipboardCheck,
  Users,
  Shield,
  Heart,
  AlertTriangle,
  Award,
} from 'lucide-react';

type ToolCategory = 'all' | 'financial' | 'quality';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  bgColor: string;
  category: 'financial' | 'quality';
  isNew?: boolean;
  isFavorite?: boolean;
}

const tools: Tool[] = [
  // Existing Financial Tools
  {
    id: 'conventional-financing',
    name: 'Conventional Financing',
    description: 'Model bank financing with LTV, DSCR, and amortization schedules',
    icon: Calculator,
    href: '/app/tools/conventional-financing',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    category: 'financial',
    isFavorite: true,
  },
  {
    id: 'lease-buyout',
    name: 'Lease Buyout Analyzer',
    description: 'Calculate lease acquisition costs and operator economics',
    icon: FileText,
    href: '/app/tools/lease-buyout',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    category: 'financial',
  },
  {
    id: 'pro-forma',
    name: 'Pro Forma Generator',
    description: 'Build multi-year operating projections with growth assumptions',
    icon: FileSpreadsheet,
    href: '/app/tools/pro-forma',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    category: 'financial',
    isFavorite: true,
  },
  {
    id: 'exit-strategy',
    name: 'Exit Strategy Analyzer',
    description: 'Compare sale, refinance, and hold scenarios',
    icon: LogOut,
    href: '/app/tools/exit-strategy',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    category: 'financial',
  },
  {
    id: 'waterfall',
    name: 'Waterfall Calculator',
    description: 'Model JV profit distributions with tiered promotes',
    icon: Layers,
    href: '/app/tools/waterfall',
    color: 'text-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    category: 'financial',
  },
  {
    id: 'deal-comparison',
    name: 'Deal Structure Comparison',
    description: 'Compare financing alternatives side-by-side',
    icon: Scale,
    href: '/app/tools/deal-comparison',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    category: 'financial',
  },

  // NEW Financial Tools
  {
    id: 'cap-rate',
    name: 'Cap Rate Calculator',
    description: 'Calculate cap rates from NOI and property values with market comps',
    icon: Percent,
    href: '/app/tools/cap-rate',
    color: 'text-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    category: 'financial',
    isNew: true,
    isFavorite: true,
  },
  {
    id: 'irr-npv',
    name: 'IRR/NPV Calculator',
    description: 'Investment return analysis with cash flow projections and sensitivity',
    icon: TrendingUp,
    href: '/app/tools/irr-npv',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    category: 'financial',
    isNew: true,
  },
  {
    id: 'debt-service',
    name: 'Debt Service Calculator',
    description: 'DSCR, debt yield analysis, and coverage ratio optimization',
    icon: Coins,
    href: '/app/tools/debt-service',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    category: 'financial',
    isNew: true,
  },
  {
    id: 'sensitivity',
    name: 'Sensitivity Analysis',
    description: 'Monte Carlo simulation and scenario modeling for key variables',
    icon: BarChart3,
    href: '/app/tools/sensitivity',
    color: 'text-violet-500',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    category: 'financial',
    isNew: true,
  },
  {
    id: 'acquisition-costs',
    name: 'Acquisition Cost Builder',
    description: 'Total acquisition costs including closing, capex, and working capital',
    icon: PieChart,
    href: '/app/tools/acquisition-costs',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    category: 'financial',
    isNew: true,
  },
  {
    id: 'refinance',
    name: 'Refinance Analyzer',
    description: 'Evaluate refinance scenarios with rate, term, and cash-out options',
    icon: RefreshCw,
    href: '/app/tools/refinance',
    color: 'text-sky-500',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
    category: 'financial',
    isNew: true,
  },
  {
    id: 'hospice-valuation',
    name: 'Hospice Valuation',
    description: 'Revenue per patient day, census-based hospice facility valuation',
    icon: Heart,
    href: '/app/tools/hospice-valuation',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    category: 'financial',
    isNew: true,
  },

  // NEW Quality/Regulatory Tools
  {
    id: 'cms-analyzer',
    name: 'CMS Star Rating Analyzer',
    description: 'Evaluate facility quality metrics and compare to state/national benchmarks',
    icon: Award,
    href: '/app/tools/cms-analyzer',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    category: 'quality',
    isNew: true,
    isFavorite: true,
  },
  {
    id: 'survey-tracker',
    name: 'Survey Deficiency Tracker',
    description: 'Track and analyze survey results, deficiencies, and compliance trends',
    icon: AlertTriangle,
    href: '/app/tools/survey-tracker',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    category: 'quality',
    isNew: true,
  },
  {
    id: 'staffing-calculator',
    name: 'Staffing Ratio Calculator',
    description: 'HPPD optimization, staffing mix analysis, and labor cost modeling',
    icon: Users,
    href: '/app/tools/staffing-calculator',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    category: 'quality',
    isNew: true,
  },
  {
    id: 'compliance-scorecard',
    name: 'Compliance Scorecard',
    description: 'Regulatory compliance dashboard with risk indicators and benchmarks',
    icon: Shield,
    href: '/app/tools/compliance-scorecard',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    category: 'quality',
    isNew: true,
  },
];

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [favorites, setFavorites] = useState<string[]>(
    tools.filter((t) => t.isFavorite).map((t) => t.id)
  );

  const filteredTools = useMemo(() => {
    if (activeCategory === 'all') return tools;
    return tools.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const favoriteTools = useMemo(() => {
    return tools.filter((t) => favorites.includes(t.id));
  }, [favorites]);

  const toggleFavorite = (toolId: string) => {
    setFavorites((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  };

  const financialCount = tools.filter((t) => t.category === 'financial').length;
  const qualityCount = tools.filter((t) => t.category === 'quality').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Analysis Tools</h1>
          <p className="text-sm text-surface-500">
            Financial calculators and quality analyzers for SNF deal analysis
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="neu-card p-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary-500" />
            <span className="text-lg font-bold">{tools.length}</span>
            <span className="text-xs text-surface-500">Tools</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-lg font-bold">{financialCount}</span>
            <span className="text-xs text-surface-500">Financial</span>
          </div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-500" />
            <span className="text-lg font-bold">{qualityCount}</span>
            <span className="text-xs text-surface-500">Quality</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-lg font-bold">{favorites.length}</span>
            <span className="text-xs text-surface-500">Favorites</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-lg w-fit">
        {[
          { id: 'all', label: 'All Tools', count: tools.length },
          { id: 'financial', label: 'Financial', count: financialCount },
          { id: 'quality', label: 'Quality', count: qualityCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as ToolCategory)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
              activeCategory === tab.id
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            )}
          >
            {tab.label}
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                activeCategory === tab.id
                  ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                  : 'bg-surface-200 dark:bg-surface-600 text-surface-500 dark:text-surface-400'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Favorites Section */}
      {favoriteTools.length > 0 && activeCategory === 'all' && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Quick Access
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {favoriteTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={`fav-${tool.id}`} href={tool.href} className="shrink-0">
                  <div className="neu-card p-3 hover-lift cursor-pointer group w-44">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${tool.bgColor}`}>
                        <Icon className={`w-4 h-4 ${tool.color}`} />
                      </div>
                      <span className="text-sm font-medium text-surface-900 dark:text-white truncate group-hover:text-primary-500 transition-colors">
                        {tool.name}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tools Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          const isFav = favorites.includes(tool.id);
          return (
            <div key={tool.id} className="neu-card p-4 hover-lift cursor-pointer group h-full relative">
              {/* Favorite toggle */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(tool.id);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors z-10"
              >
                <Star
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isFav ? 'text-amber-500 fill-amber-500' : 'text-surface-300 hover:text-amber-400'
                  )}
                />
              </button>

              <Link href={tool.href} className="block">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                    <Icon className={`w-5 h-5 ${tool.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-surface-900 dark:text-white group-hover:text-primary-500 transition-colors">
                        {tool.name}
                      </h3>
                      {tool.isNew && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-primary-500 text-white rounded">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {tool.description}
                    </p>
                    {/* Category badge */}
                    <span
                      className={cn(
                        'inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full',
                        tool.category === 'financial'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      )}
                    >
                      {tool.category === 'financial' ? 'Financial' : 'Quality'}
                    </span>
                  </div>
                </div>
                <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-surface-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Documentation Section */}
      <div className="neu-card p-4">
        <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">
          How to Use These Tools
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h4 className="text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-500" />
              For Deal Evaluation
            </h4>
            <ol className="text-xs text-surface-500 space-y-0.5 list-decimal list-inside">
              <li>Start with Cap Rate Calculator for quick valuation</li>
              <li>Use IRR/NPV for investment returns</li>
              <li>Run Sensitivity Analysis for risk assessment</li>
              <li>Model exit scenarios with Exit Strategy Analyzer</li>
            </ol>
          </div>
          <div>
            <h4 className="text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5 flex items-center gap-1">
              <Calculator className="w-3 h-3 text-blue-500" />
              For Financing Analysis
            </h4>
            <ol className="text-xs text-surface-500 space-y-0.5 list-decimal list-inside">
              <li>Use Debt Service Calculator for DSCR</li>
              <li>Model bank loans with Conventional Financing</li>
              <li>Evaluate Refinance opportunities</li>
              <li>Build total costs with Acquisition Cost Builder</li>
            </ol>
          </div>
          <div>
            <h4 className="text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5 flex items-center gap-1">
              <ClipboardCheck className="w-3 h-3 text-amber-500" />
              For Quality Assessment
            </h4>
            <ol className="text-xs text-surface-500 space-y-0.5 list-decimal list-inside">
              <li>Check CMS Star Ratings for quality metrics</li>
              <li>Review Survey Deficiency history</li>
              <li>Analyze staffing with HPPD Calculator</li>
              <li>Get overall view with Compliance Scorecard</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
