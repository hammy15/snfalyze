"use client"

import { useState, useRef, useEffect, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: "top" | "bottom" | "left" | "right"
  delay?: number
  className?: string
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 200,
  className
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const gap = 8

      let x = 0
      let y = 0

      switch (position) {
        case "top":
          x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
          y = triggerRect.top - tooltipRect.height - gap
          break
        case "bottom":
          x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
          y = triggerRect.bottom + gap
          break
        case "left":
          x = triggerRect.left - tooltipRect.width - gap
          y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
          break
        case "right":
          x = triggerRect.right + gap
          y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
          break
      }

      // Keep within viewport
      x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8))
      y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8))

      setCoords({ x, y })
    }
  }, [isVisible, position])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const arrowPositions = {
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45",
    bottom: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45",
    left: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rotate-45",
    right: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45"
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "fixed z-[200] px-3 py-2 text-sm rounded-lg",
            "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
            "shadow-lg animate-fade-in",
            "max-w-xs",
            className
          )}
          style={{
            left: coords.x,
            top: coords.y,
          }}
        >
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-2 h-2 bg-gray-900 dark:bg-white",
              arrowPositions[position]
            )}
          />
          <span className="relative z-10">{content}</span>
        </div>
      )}
    </>
  )
}
