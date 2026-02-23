'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText,
  Building2,
  TrendingDown,
  Home,
  Heart,
  Layers,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Star,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface DealTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof Building2;
  color: string;
  bg: string;
  tags: string[];
  defaults: {
    assetType: string;
    dealStructure?: string;
    typicalBeds?: string;
    typicalPrice?: string;
    keyRisks: string[];
    keyOpportunities: string[];
    intakeDefaults: Record<string, unknown>;
  };
}

const TEMPLATES: DealTemplate[] = [
  {
    id: 'distressed-snf',
    name: 'Distressed SNF Turnaround',
    description: 'Low-rated or SFF facility with operational upside. Focus on survey correction, staffing stabilization, and census recovery.',
    icon: TrendingDown,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/10',
    tags: ['SNF', 'Turnaround', 'High Risk'],
    defaults: {
      assetType: 'SNF',
      dealStructure: 'owned',
      typicalBeds: '80-120',
      typicalPrice: '$3M-$8M',
      keyRisks: ['Active SFF or IJ citations', 'Staff turnover >50%', 'Agency staffing >30%', 'Census below 70%'],
      keyOpportunities: ['Rating improvement 1→3 stars adds 15-25% to value', 'Agency reduction saves $500K-$1.5M/yr', 'Medicaid rate capture from quality improvement', 'Census recovery to 85%+ in 12-18 months'],
      intakeDefaults: {
        dealStructure: 'owned',
        realEstateIncluded: true,
      },
    },
  },
  {
    id: 'stable-alf',
    name: 'Stable ALF Portfolio',
    description: 'Performing assisted living with strong census and private pay mix. Focus on revenue optimization and expense management.',
    icon: Home,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    tags: ['ALF', 'Stable', 'Low Risk'],
    defaults: {
      assetType: 'ALF',
      dealStructure: 'owned',
      typicalBeds: '60-100',
      typicalPrice: '$5M-$15M',
      keyRisks: ['Private pay concentration risk', 'Staff retention in competitive market', 'Regulatory changes', 'Competition from new builds'],
      keyOpportunities: ['Memory care wing addition', 'Rate increase program', 'Ancillary services (therapy, pharmacy)', 'Portfolio synergies with existing ops'],
      intakeDefaults: {
        dealStructure: 'owned',
        realEstateIncluded: true,
      },
    },
  },
  {
    id: 'hospice-startup',
    name: 'Hospice Acquisition',
    description: 'Operating hospice agency or startup with census development opportunity. Focus on referral network and compliance.',
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-50 dark:bg-pink-900/10',
    tags: ['Hospice', 'Growth', 'Medium Risk'],
    defaults: {
      assetType: 'HOSPICE',
      dealStructure: 'owned',
      typicalBeds: 'N/A (census-based)',
      typicalPrice: '$2M-$10M',
      keyRisks: ['Medicare cap exposure', 'Referral concentration', 'Regulatory audit risk', 'GIP/CHC length-of-stay scrutiny'],
      keyOpportunities: ['Census growth from referral development', 'Geographic expansion', 'Palliative care bridge program', 'Per-diem rate optimization'],
      intakeDefaults: {
        dealStructure: 'owned',
        realEstateIncluded: false,
      },
    },
  },
  {
    id: 'lease-to-own',
    name: 'Lease-to-Own Conversion',
    description: 'Converting a master lease to fee-simple ownership. Focus on lease economics, RE valuation, and operator transition.',
    icon: Layers,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/10',
    tags: ['SNF/ALF', 'Conversion', 'Medium Risk'],
    defaults: {
      assetType: 'SNF',
      dealStructure: 'leased',
      typicalBeds: '100-200',
      typicalPrice: '$8M-$25M',
      keyRisks: ['Lease escalation exposure', 'Deferred maintenance on RE', 'Seller financing terms', 'Regulatory approval timeline'],
      keyOpportunities: ['Rent elimination improves EBITDA by $1-3M', 'RE appreciation upside', 'Refinance at lower rates', 'Operational control improvements'],
      intakeDefaults: {
        dealStructure: 'leased',
        realEstateIncluded: true,
      },
    },
  },
  {
    id: 'multi-facility',
    name: 'Multi-Facility Platform',
    description: 'Portfolio of 3+ facilities as a platform acquisition. Focus on synergies, management infrastructure, and growth plan.',
    icon: Building2,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    tags: ['Portfolio', 'Platform', 'Complex'],
    defaults: {
      assetType: 'SNF',
      dealStructure: 'owned',
      typicalBeds: '300-500+',
      typicalPrice: '$15M-$50M+',
      keyRisks: ['Management bandwidth', 'Geographic dispersion', 'Regulatory approval across states', 'Integration timeline 12-18 months'],
      keyOpportunities: ['Shared services reduce overhead 10-15%', 'Group purchasing discounts', 'Regional management density', 'Add-on acquisition pipeline'],
      intakeDefaults: {
        dealStructure: 'owned',
        realEstateIncluded: true,
      },
    },
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (template: DealTemplate) => {
    setCreating(true);
    setSelectedTemplate(template.id);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `New ${template.name}`,
          assetType: template.defaults.assetType,
          status: 'new',
          notes: `Template: ${template.name}\n\nKey Risks:\n${template.defaults.keyRisks.map(r => `- ${r}`).join('\n')}\n\nKey Opportunities:\n${template.defaults.keyOpportunities.map(o => `- ${o}`).join('\n')}`,
          templateId: template.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const dealId = data.deal?.id || data.data?.id || data.id;
        if (dealId) {
          router.push(`/app/deals/${dealId}/workspace`);
          return;
        }
      }
      router.push('/app/deals');
    } catch {
      router.push('/app/deals');
    }
  };

  return (
    <div className="py-6 px-4 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          Deal Templates
        </h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Start from a proven archetype — pre-filled risk factors, opportunity areas, and intake defaults
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map(template => {
          const Icon = template.icon;
          const isSelected = selectedTemplate === template.id;
          return (
            <div
              key={template.id}
              className={cn(
                'border rounded-xl bg-white dark:bg-surface-900 overflow-hidden transition-all hover:shadow-md',
                isSelected ? 'border-primary-400 dark:border-primary-600 ring-1 ring-primary-200 dark:ring-primary-800' : 'border-surface-200 dark:border-surface-700'
              )}
            >
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn('p-2 rounded-lg', template.bg)}>
                    <Icon className={cn('w-5 h-5', template.color)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-surface-800 dark:text-surface-200">{template.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      {template.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 text-[9px] font-medium bg-surface-100 dark:bg-surface-800 text-surface-500 rounded">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-surface-500 mb-4">{template.description}</p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-surface-400 uppercase">Typical Size</p>
                    <p className="text-xs font-medium text-surface-700 dark:text-surface-300">{template.defaults.typicalBeds}</p>
                  </div>
                  <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-surface-400 uppercase">Typical Price</p>
                    <p className="text-xs font-medium text-surface-700 dark:text-surface-300">{template.defaults.typicalPrice}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-[10px] font-semibold text-red-500 uppercase mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Key Risks
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.defaults.keyRisks.slice(0, 2).map(r => (
                        <span key={r} className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-1.5 py-0.5 rounded">{r}</span>
                      ))}
                      {template.defaults.keyRisks.length > 2 && (
                        <span className="text-[10px] text-surface-400">+{template.defaults.keyRisks.length - 2} more</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-emerald-500 uppercase mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Opportunities
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.defaults.keyOpportunities.slice(0, 2).map(o => (
                        <span key={o} className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded">{o}</span>
                      ))}
                      {template.defaults.keyOpportunities.length > 2 && (
                        <span className="text-[10px] text-surface-400">+{template.defaults.keyOpportunities.length - 2} more</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/20">
                <button
                  onClick={() => handleCreate(template)}
                  disabled={creating}
                  className="flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-colors"
                >
                  {creating && isSelected ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating...</>
                  ) : (
                    <><ArrowRight className="w-3.5 h-3.5" />Use Template</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
