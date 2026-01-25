'use client';

import * as React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Database,
  Key,
  Bell,
  Users,
  Building2,
  FileText,
  Shield,
  Download,
  Upload,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Platform configuration and system settings"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-surface-500" />
                <CardTitle>Organization</CardTitle>
              </div>
              <CardDescription>Cascadia Healthcare settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Organization Name"
                defaultValue="Cascadia Healthcare"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Primary Contact"
                  defaultValue="Operations Team"
                />
                <Input
                  label="Contact Email"
                  type="email"
                  defaultValue="ops@cascadiahealthcare.com"
                />
              </div>
              <div className="pt-4 flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          {/* API Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-surface-500" />
                <CardTitle>API Configuration</CardTitle>
              </div>
              <CardDescription>External service connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-surface-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-sm">AI</span>
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">Claude API</p>
                      <p className="text-sm text-surface-500">AI analysis engine</p>
                    </div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-surface-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">Neon Database</p>
                      <p className="text-sm text-surface-500">PostgreSQL storage</p>
                    </div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-surface-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">OCR Service</p>
                      <p className="text-sm text-surface-500">Document processing</p>
                    </div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-surface-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 font-semibold text-sm">CMS</span>
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">CMS Data API</p>
                      <p className="text-sm text-surface-500">Regulatory data</p>
                    </div>
                  </div>
                  <Badge variant="warning">Optional</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cascadia COA */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-surface-500" />
                <CardTitle>Cascadia Chart of Accounts</CardTitle>
              </div>
              <CardDescription>Financial normalization mappings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-surface-600">
                  The Cascadia COA is the single source of truth for financial normalization.
                  All external financials are mapped to this standard structure.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-surface-50">
                    <p className="text-sm text-surface-500">Revenue Categories</p>
                    <p className="text-2xl font-bold text-surface-900">24</p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-50">
                    <p className="text-sm text-surface-500">Expense Categories</p>
                    <p className="text-2xl font-bold text-surface-900">42</p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-50">
                    <p className="text-sm text-surface-500">Synonym Mappings</p>
                    <p className="text-2xl font-bold text-surface-900">156</p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-50">
                    <p className="text-sm text-surface-500">Last Updated</p>
                    <p className="text-lg font-bold text-surface-900">Jan 15, 2024</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary">
                    <Download className="w-4 h-4 mr-2" />
                    Export COA
                  </Button>
                  <Button variant="secondary">
                    <Upload className="w-4 h-4 mr-2" />
                    Update Mappings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-surface-500" />
                <CardTitle>Data Management</CardTitle>
              </div>
              <CardDescription>Deal memory and learning system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-surface-50 text-center">
                    <p className="text-2xl font-bold text-surface-900">47</p>
                    <p className="text-sm text-surface-500">Deals Analyzed</p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-50 text-center">
                    <p className="text-2xl font-bold text-surface-900">12</p>
                    <p className="text-sm text-surface-500">Deals Closed</p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-50 text-center">
                    <p className="text-2xl font-bold text-surface-900">156</p>
                    <p className="text-sm text-surface-500">Human Overrides</p>
                  </div>
                </div>
                <p className="text-sm text-surface-600">
                  Deal memory persists thesis, assumptions, human overrides, and outcomes.
                  This data trains the system's judgment over time.
                </p>
                <div className="flex gap-3">
                  <Button variant="secondary">
                    <Download className="w-4 h-4 mr-2" />
                    Export Deal Memory
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-600">API Status</span>
                  <Badge variant="success">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-600">Database</span>
                  <Badge variant="success">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-600">OCR Service</span>
                  <Badge variant="success">Ready</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-600">AI Engine</span>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-surface-500" />
                <CardTitle>Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-surface-700">Analysis Complete</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-surface-700">New Deal Uploaded</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-surface-700">Partner Match Found</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-surface-700">Low Confidence Alerts</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-surface-500" />
                <CardTitle>Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-surface-600">
                  All data is encrypted at rest and in transit. Deal memory creates
                  immutable versions for audit trails.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-surface-700">
                    <span className="w-2 h-2 rounded-full bg-status-success" />
                    AES-256 encryption
                  </div>
                  <div className="flex items-center gap-2 text-surface-700">
                    <span className="w-2 h-2 rounded-full bg-status-success" />
                    SOC 2 compliant
                  </div>
                  <div className="flex items-center gap-2 text-surface-700">
                    <span className="w-2 h-2 rounded-full bg-status-success" />
                    Immutable audit logs
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-surface-500" />
                <CardTitle>Team</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-700">Active Users</span>
                  <span className="font-medium text-surface-900">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-700">Admin Users</span>
                  <span className="font-medium text-surface-900">2</span>
                </div>
                <Button variant="secondary" size="sm" className="w-full mt-2">
                  Manage Team
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
