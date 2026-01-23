"use client"

import { useState, useRef, useEffect, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  badge?: string | number
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  children: ReactNode
  variant?: "default" | "pills" | "underline"
  className?: string
}

export function AnimatedTabs({
  tabs,
  defaultTab,
  onChange,
  children,
  variant = "default",
  className
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Update indicator position
  useEffect(() => {
    const activeEl = tabRefs.current.get(activeTab)
    if (activeEl && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const tabRect = activeEl.getBoundingClientRect()
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width
      })
    }
  }, [activeTab])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onChange?.(tabId)
  }

  const variantStyles = {
    default: {
      container: "bg-gray-100 dark:bg-[#0f0f10] p-1 rounded-xl",
      tab: "px-4 py-2 rounded-lg",
      activeTab: "text-gray-900 dark:text-white",
      inactiveTab: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
      indicator: "bg-white dark:bg-gradient-to-b dark:from-[#2a2a2d] dark:to-[#222225] shadow-sm dark:shadow-lg rounded-lg"
    },
    pills: {
      container: "gap-2",
      tab: "px-4 py-2 rounded-full",
      activeTab: "bg-teal-500 text-white shadow-lg shadow-teal-500/30",
      inactiveTab: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10",
      indicator: ""
    },
    underline: {
      container: "border-b border-gray-200 dark:border-white/10",
      tab: "px-4 py-3",
      activeTab: "text-teal-600 dark:text-teal-400",
      inactiveTab: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
      indicator: "absolute bottom-0 h-0.5 bg-teal-500 rounded-full"
    }
  }

  const styles = variantStyles[variant]

  return (
    <div className={className}>
      {/* Tab list */}
      <div
        ref={containerRef}
        role="tablist"
        className={cn("relative flex", styles.container)}
      >
        {/* Animated indicator for default variant */}
        {variant === "default" && (
          <div
            className={cn("absolute top-1 transition-all duration-300 ease-out", styles.indicator)}
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              height: "calc(100% - 8px)"
            }}
          />
        )}

        {/* Underline indicator */}
        {variant === "underline" && (
          <div
            className={cn("transition-all duration-300 ease-out", styles.indicator)}
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width
            }}
          />
        )}

        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => { if (el) tabRefs.current.set(tab.id, el) }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && handleTabChange(tab.id)}
            className={cn(
              "relative z-10 flex items-center gap-2 font-medium transition-all duration-200",
              styles.tab,
              activeTab === tab.id ? styles.activeTab : styles.inactiveTab,
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && (
              <span className={cn(
                "px-1.5 py-0.5 text-xs rounded-full",
                activeTab === tab.id
                  ? "bg-white/20 text-current"
                  : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300"
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="mt-4">
        {children}
      </div>
    </div>
  )
}

interface TabPanelProps {
  id: string
  activeTab: string
  children: ReactNode
  className?: string
}

export function TabPanel({ id, activeTab, children, className }: TabPanelProps) {
  if (id !== activeTab) return null

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={id}
      className={cn("animate-fade-in", className)}
    >
      {children}
    </div>
  )
}

// ============================================
// Shadcn/UI-compatible Tabs API
// ============================================
import * as React from "react"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs compound components must be used within a Tabs component")
  }
  return context
}

interface TabsRootProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

function TabsRoot({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  className
}: TabsRootProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "")
  const value = controlledValue ?? uncontrolledValue

  const handleValueChange = React.useCallback((newValue: string) => {
    setUncontrolledValue(newValue)
    onValueChange?.(newValue)
  }, [onValueChange])

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-surface-100 p-1 text-surface-500 dark:bg-surface-800 dark:text-surface-400",
        className
      )}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext()
  const isSelected = selectedValue === value

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-white text-surface-900 shadow-sm dark:bg-surface-900 dark:text-surface-50"
          : "text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-50",
        className
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext()

  if (selectedValue !== value) return null

  return (
    <div
      role="tabpanel"
      className={cn("mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2", className)}
    >
      {children}
    </div>
  )
}

// Export shadcn/ui compatible components
export { TabsRoot as Tabs, TabsList, TabsTrigger, TabsContent }
