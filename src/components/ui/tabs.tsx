'use client';

import * as React from 'react';
import { useState, createContext, useContext } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

// ============================================================================
// Radix UI based Tabs (shadcn/ui compatible)
// ============================================================================

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-[var(--gray-100)] p-1 text-[var(--color-text-secondary)]',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-white data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:shadow-sm',
      'data-[state=inactive]:hover:bg-[var(--gray-200)] data-[state=inactive]:hover:text-[var(--color-text-primary)]',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] focus-visible:ring-offset-2',
      'data-[state=inactive]:hidden',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// ============================================================================
// Legacy Custom Tabs (keep for backwards compatibility)
// ============================================================================

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

interface LegacyTabsProps {
  defaultTab: string;
  children: React.ReactNode;
  className?: string;
  onChange?: (tabId: string) => void;
}

export function LegacyTabs({ defaultTab, children, className, onChange }: LegacyTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleSetActiveTab = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabList({ children, className }: TabListProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 border-b border-[var(--color-border-muted)]',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

interface TabProps {
  id: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export function Tab({ id, children, icon, badge, disabled }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(id)}
      className={cn(
        'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
        'border-b-2 -mb-px',
        isActive
          ? 'border-[var(--accent-solid)] text-[var(--accent-solid)]'
          : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--gray-300)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {icon}
      {children}
      {badge !== undefined && (
        <span
          className={cn(
            'px-1.5 py-0.5 text-xs rounded-full',
            isActive
              ? 'bg-[var(--accent-light)] text-[var(--accent-solid)]'
              : 'bg-[var(--gray-100)] text-[var(--color-text-tertiary)]'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === id;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={id}
      className={cn('py-6', className)}
    >
      {children}
    </div>
  );
}

// Export both APIs
// New shadcn/ui compatible API (radix-based)
export { Tabs, TabsList, TabsTrigger, TabsContent };

// Also export legacy as aliases for backwards compatibility
export { LegacyTabs as CustomTabs };
