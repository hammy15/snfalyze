'use client';

import * as React from 'react';
import Link from 'next/link';
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
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tools = [
  {
    id: 'conventional-financing',
    name: 'Conventional Financing Calculator',
    description: 'Model bank financing with LTV, DSCR, debt service coverage, and amortization schedules',
    icon: Calculator,
    href: '/app/tools/conventional-financing',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'lease-buyout',
    name: 'Lease Buyout Analyzer',
    description: 'Calculate lease acquisition costs and their impact on operator economics and coverage ratios',
    icon: FileText,
    href: '/app/tools/lease-buyout',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'pro-forma',
    name: 'Pro Forma Generator',
    description: 'Build multi-year operating projections with revenue growth, expense inflation, and occupancy improvements',
    icon: FileSpreadsheet,
    href: '/app/tools/pro-forma',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'exit-strategy',
    name: 'Exit Strategy Analyzer',
    description: 'Compare sale, refinance, and hold scenarios to optimize exit timing and maximize returns',
    icon: LogOut,
    href: '/app/tools/exit-strategy',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'waterfall',
    name: 'Waterfall Distribution Calculator',
    description: 'Model JV/partnership profit distributions with tiered promotes and preferred returns',
    icon: Layers,
    href: '/app/tools/waterfall',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  {
    id: 'deal-comparison',
    name: 'Deal Structure Comparison',
    description: 'Compare financing alternatives side-by-side to find the optimal deal structure',
    icon: Scale,
    href: '/app/tools/deal-comparison',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
];

export default function FinancialToolsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Financial Analysis Tools</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive suite of calculators and analyzers for SNF deal analysis
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calculator className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{tools.length}</div>
                <div className="text-xs text-muted-foreground">Analysis Tools</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Building2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">4</div>
                <div className="text-xs text-muted-foreground">Deal Structures</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">IRR/NPV</div>
                <div className="text-xs text-muted-foreground">Return Analysis</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">Live</div>
                <div className="text-xs text-muted-foreground">Calculations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tools Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card key={tool.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${tool.bgColor}`}>
                    <Icon className={`h-6 w-6 ${tool.color}`} />
                  </div>
                </div>
                <CardTitle className="mt-4">{tool.name}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={tool.href}>
                  <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">
                    Open Tool
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Documentation Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How to Use These Tools</CardTitle>
          <CardDescription>
            Quick guide to get the most out of the financial analysis suite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">For Deal Evaluation</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Start with the Deal Comparison tool to evaluate structures</li>
                <li>Use Pro Forma Generator for operating projections</li>
                <li>Run Exit Strategy analysis for optimal timing</li>
                <li>Model partnership terms with Waterfall Calculator</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">For Financing Analysis</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Use Conventional Financing for bank loan modeling</li>
                <li>Compare to Sale-Leaseback in Deal Comparison</li>
                <li>Analyze Lease Buyout for existing operator deals</li>
                <li>Review DSCR and coverage ratios across structures</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
