"use client"

import { useState, useRef, ReactNode, ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface RippleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  icon?: ReactNode
  iconPosition?: "left" | "right"
}

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

export function RippleButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  className,
  disabled,
  onClick,
  ...props
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const buttonRef = useRef<HTMLButtonElement>(null)
  const rippleIdRef = useRef(0)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return

    const button = buttonRef.current
    if (button) {
      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const newRipple: Ripple = {
        id: rippleIdRef.current++,
        x,
        y,
        size
      }

      setRipples((prev) => [...prev, newRipple])

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
      }, 600)
    }

    onClick?.(e)
  }

  const variantStyles = {
    primary: cn(
      "bg-teal-500 text-white",
      "hover:bg-teal-600",
      "shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30",
      "dark:shadow-teal-500/20 dark:hover:shadow-teal-500/30"
    ),
    secondary: cn(
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200",
      "hover:bg-gray-200 dark:hover:bg-gray-700",
      "border border-gray-200 dark:border-gray-700"
    ),
    ghost: cn(
      "bg-transparent text-gray-600 dark:text-gray-300",
      "hover:bg-gray-100 dark:hover:bg-white/10"
    ),
    outline: cn(
      "bg-transparent text-teal-600 dark:text-teal-400",
      "border-2 border-teal-500 dark:border-teal-400",
      "hover:bg-teal-50 dark:hover:bg-teal-500/10"
    ),
    danger: cn(
      "bg-rose-500 text-white",
      "hover:bg-rose-600",
      "shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30"
    )
  }

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
    md: "px-5 py-2.5 text-base rounded-xl gap-2",
    lg: "px-7 py-3.5 text-lg rounded-xl gap-2.5"
  }

  const rippleColor = variant === "primary" || variant === "danger"
    ? "bg-white/30"
    : "bg-black/10 dark:bg-white/20"

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        "relative overflow-hidden",
        "inline-flex items-center justify-center font-medium",
        "transition-all duration-200 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        "active:scale-[0.98]",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {/* Ripples */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className={cn(
            "absolute rounded-full pointer-events-none",
            "animate-ripple",
            rippleColor
          )}
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size
          }}
        />
      ))}

      {/* Loading spinner */}
      {loading && (
        <svg className="absolute animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}

      {/* Content */}
      <span className={cn(
        "relative z-10 flex items-center",
        sizeStyles[size].split(" ").find(c => c.startsWith("gap")),
        loading && "invisible"
      )}>
        {icon && iconPosition === "left" && icon}
        {children}
        {icon && iconPosition === "right" && icon}
      </span>
    </button>
  )
}
