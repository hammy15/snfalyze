"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  status?: "online" | "offline" | "busy" | "away"
  className?: string
}

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  status,
  className
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl"
  }

  const statusSizes = {
    xs: "w-1.5 h-1.5 border",
    sm: "w-2 h-2 border",
    md: "w-2.5 h-2.5 border-2",
    lg: "w-3 h-3 border-2",
    xl: "w-4 h-4 border-2"
  }

  const statusColors = {
    online: "bg-emerald-500",
    offline: "bg-gray-400",
    busy: "bg-rose-500",
    away: "bg-amber-500"
  }

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Generate color from name
  const getColorFromName = (name: string) => {
    const colors = [
      "from-teal-400 to-teal-600",
      "from-blue-400 to-blue-600",
      "from-purple-400 to-purple-600",
      "from-pink-400 to-pink-600",
      "from-amber-400 to-amber-600",
      "from-emerald-400 to-emerald-600",
      "from-rose-400 to-rose-600",
      "from-cyan-400 to-cyan-600"
    ]
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  const showImage = src && !imageError
  const showInitials = !showImage && name
  const showFallback = !showImage && !showInitials

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden flex items-center justify-center font-medium",
          "ring-2 ring-white dark:ring-gray-900",
          sizeClasses[size],
          showInitials && `bg-gradient-to-br ${getColorFromName(name!)} text-white`,
          showFallback && "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
        )}
      >
        {showImage && (
          <img
            src={src}
            alt={alt || name || "Avatar"}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        )}
        {showInitials && getInitials(name!)}
        {showFallback && (
          <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>

      {/* Status indicator */}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-white dark:border-gray-900",
            statusSizes[size],
            statusColors[status],
            status === "online" && "animate-pulse-soft"
          )}
        />
      )}
    </div>
  )
}

// Avatar Group
interface AvatarGroupProps {
  avatars: AvatarProps[]
  max?: number
  size?: AvatarProps["size"]
  className?: string
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = "md",
  className
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max)
  const remainingCount = avatars.length - max

  const overlapClasses = {
    xs: "-ml-2",
    sm: "-ml-2.5",
    md: "-ml-3",
    lg: "-ml-4",
    xl: "-ml-5"
  }

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg"
  }

  return (
    <div className={cn("flex items-center", className)}>
      {visibleAvatars.map((avatar, index) => (
        <div
          key={index}
          className={cn(
            "relative",
            index > 0 && overlapClasses[size],
            "hover:z-10 transition-transform hover:scale-110"
          )}
          style={{ zIndex: visibleAvatars.length - index }}
        >
          <Avatar {...avatar} size={size} />
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            "relative rounded-full flex items-center justify-center font-medium",
            "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
            "ring-2 ring-white dark:ring-gray-900",
            overlapClasses[size],
            sizeClasses[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
