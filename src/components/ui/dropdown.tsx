"use client"

import { useState, useRef, useEffect, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DropdownOption {
  value: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

interface DropdownProps {
  options: DropdownOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  error,
  disabled,
  className
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault()
        if (isOpen && highlightedIndex >= 0) {
          const option = options[highlightedIndex]
          if (!option.disabled) {
            onChange(option.value)
            setIsOpen(false)
          }
        } else {
          setIsOpen(true)
        }
        break
      case "ArrowDown":
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) => {
            const next = prev < options.length - 1 ? prev + 1 : 0
            return options[next]?.disabled ? (next < options.length - 1 ? next + 1 : 0) : next
          })
        }
        break
      case "ArrowUp":
        e.preventDefault()
        if (isOpen) {
          setHighlightedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : options.length - 1
            return options[next]?.disabled ? (next > 0 ? next - 1 : options.length - 1) : next
          })
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl",
          "text-left transition-all duration-200",
          "bg-gray-100 dark:bg-[#0f0f10]",
          "border dark:border-white/10",
          "focus:outline-none focus:ring-2 focus:ring-teal-500/50",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-rose-500 dark:border-rose-500/50",
          !disabled && "hover:border-teal-500/50 dark:hover:border-teal-500/30"
        )}
      >
        <span className={cn(
          selectedOption ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"
        )}>
          <span className="flex items-center gap-2">
            {selectedOption?.icon}
            {selectedOption?.label || placeholder}
          </span>
        </span>
        <svg
          className={cn(
            "w-5 h-5 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Error message */}
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}

      {/* Options */}
      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className={cn(
            "absolute z-50 w-full mt-2 py-2 rounded-xl overflow-hidden",
            "bg-white dark:bg-gradient-to-b dark:from-[#1c1c1f] dark:to-[#141416]",
            "border border-gray-200 dark:border-white/10",
            "shadow-xl dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)]",
            "animate-scale-in origin-top"
          )}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled}
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.value)
                  setIsOpen(false)
                }
              }}
              onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors",
                option.value === value && "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400",
                option.value !== value && highlightedIndex === index && "bg-gray-50 dark:bg-white/5",
                option.disabled && "opacity-50 cursor-not-allowed",
                !option.disabled && option.value !== value && "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
              )}
            >
              {option.icon && <span className="shrink-0">{option.icon}</span>}
              <span>{option.label}</span>
              {option.value === value && (
                <svg className="w-4 h-4 ml-auto text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
