"use client"

import { useState } from "react"

export default function DesignDemoPage() {
  const [isDark, setIsDark] = useState(false)
  const [loading, setLoading] = useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  const handleLoadingDemo = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0a0a0b] p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 bg-clip-text text-transparent mb-2">
              Hammy Design System
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Clean & Minimal | Turquoise | Neumorphism | Dark Mode
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-3 rounded-xl transition-all duration-200 ${
              isDark
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)] hover:border-teal-500'
                : 'bg-white border-2 border-gray-200 shadow-md hover:shadow-lg hover:border-teal-500'
            }`}
          >
            {isDark ? (
              <svg className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="neu-card">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">$2.4M</p>
            <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-500 mt-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              <span>+12.5%</span>
              <span className="text-gray-500 dark:text-gray-400">vs last month</span>
            </div>
          </div>
          <div className="neu-card">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Deals</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">47</p>
            <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-500 mt-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              <span>+8</span>
              <span className="text-gray-500 dark:text-gray-400">this week</span>
            </div>
          </div>
          <div className="neu-card">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Facilities</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">156</p>
            <div className="flex items-center gap-1 text-sm text-rose-600 dark:text-rose-500 mt-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
              </svg>
              <span>-2</span>
              <span className="text-gray-500 dark:text-gray-400">vs last month</span>
            </div>
          </div>
          <div className="neu-card">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Conversion</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">24.8%</p>
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
              </svg>
              <span>No change</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Neumorphic Components */}
          <div className="neu-card">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Neumorphic Components</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Soft shadows create depth</p>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-200 dark:bg-[#0f0f10]" style={{
                boxShadow: isDark
                  ? 'inset 0 2px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
                  : 'inset 4px 4px 8px #d1d1d1, inset -4px -4px 8px #ffffff'
              }}>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Inset neumorphic panel
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button className="neu-button">Secondary</button>
                <button className="neu-button-primary">Primary</button>
              </div>
              <input
                className="neu-input"
                placeholder="Neumorphic input..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="neu-card">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Button Variants</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Multiple styles for contexts</p>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button className="px-6 py-3 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors">
                  Primary
                </button>
                <button className="neu-button">Secondary</button>
                <button className="px-6 py-3 rounded-xl bg-transparent text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                  Ghost
                </button>
                <button className="px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:border-teal-500 transition-colors">
                  Outline
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleLoadingDemo}
                  className="px-6 py-3 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors flex items-center gap-2"
                >
                  {loading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {loading ? "Loading..." : "Click for Loading"}
                </button>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="neu-card">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Badges & Status</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Visual status indicators</p>
            <div className="flex flex-wrap gap-2">
              <span className="neu-badge">Default</span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-teal-500/20 text-teal-700 dark:text-teal-300">Primary</span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">Success</span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-500/20 text-amber-700 dark:text-amber-300">Warning</span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-rose-500/20 text-rose-700 dark:text-rose-300">Danger</span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-sky-500/20 text-sky-700 dark:text-sky-300">Info</span>
            </div>
          </div>

          {/* Inputs */}
          <div className="neu-card">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Form Inputs</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Clean form components</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input className="neu-input" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">With Error</label>
                <input className="neu-input ring-2 ring-rose-500/50" placeholder="Invalid input" />
                <p className="text-xs text-rose-500 mt-1">This field is required</p>
              </div>
            </div>
          </div>
        </div>

        {/* Effects */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Effects & Animations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Glass */}
          <div className="relative h-48 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-orange-500"></div>
            <div className="absolute inset-4 rounded-xl p-4 flex items-center justify-center backdrop-blur-lg bg-white/30 dark:bg-black/30 border border-white/20">
              <span className="text-lg font-medium text-white">Glass Effect</span>
            </div>
          </div>

          {/* Glow */}
          <div className="glow neu-card h-48 flex items-center justify-center cursor-pointer">
            <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Hover for Glow</span>
          </div>

          {/* Shimmer */}
          <div className="neu-card h-48 p-4 space-y-3">
            <div className="shimmer h-6 w-3/4 rounded"></div>
            <div className="shimmer h-4 w-full rounded"></div>
            <div className="shimmer h-4 w-5/6 rounded"></div>
            <div className="shimmer h-4 w-4/6 rounded"></div>
            <div className="shimmer h-10 w-1/3 rounded-lg mt-4"></div>
          </div>
        </div>

        {/* Animations */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="neu-card p-6 text-center animate-fade-in-up hover:scale-105 transition-transform cursor-pointer">
            <div className="text-2xl mb-2">fade-in</div>
            <p className="text-sm text-gray-600 dark:text-gray-500">Entrance</p>
          </div>
          <div className="neu-card p-6 text-center animate-scale-in hover:scale-105 transition-transform cursor-pointer">
            <div className="text-2xl mb-2">scale</div>
            <p className="text-sm text-gray-600 dark:text-gray-500">Pop</p>
          </div>
          <div className="neu-card p-6 text-center hover:scale-105 transition-transform cursor-pointer">
            <div className="text-2xl mb-2 animate-float">float</div>
            <p className="text-sm text-gray-600 dark:text-gray-500">Continuous</p>
          </div>
          <div className="neu-card p-6 text-center hover:scale-105 transition-transform cursor-pointer">
            <div className="text-2xl mb-2 animate-pulse-soft">pulse</div>
            <p className="text-sm text-gray-600 dark:text-gray-500">Attention</p>
          </div>
        </div>

        {/* Color Palette */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Primary Color (Turquoise)</h2>
        <div className="flex gap-2 mb-12 overflow-x-auto pb-2">
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-lg bg-teal-50"></div>
            <span className="text-xs text-gray-600 dark:text-gray-500">50</span>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-lg bg-teal-100"></div>
            <span className="text-xs text-gray-600 dark:text-gray-500">100</span>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-lg bg-teal-200"></div>
            <span className="text-xs text-gray-600 dark:text-gray-500">200</span>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-lg bg-teal-300"></div>
            <span className="text-xs text-gray-600 dark:text-gray-500">300</span>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-lg bg-teal-400"></div>
            <span className="text-xs text-gray-600 dark:text-gray-500">400</span>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-lg bg-teal-500"></div>
            <span className="text-xs text-gray-600 dark:text-gray-500">500</span>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-lg bg-teal-600"></div>
            <span className="text-xs text-gray-600 dark:text-gray-500">600</span>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-lg bg-teal-700"></div>
            <span className="text-xs text-gray-600 dark:text-gray-500">700</span>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-lg bg-teal-800"></div>
            <span className="text-xs text-gray-600 dark:text-gray-500">800</span>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-lg bg-teal-900"></div>
            <span className="text-xs text-gray-600 dark:text-gray-500">900</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Hammy Design System • Tailwind • Neumorphism • Dark Mode
          </p>
        </div>
      </div>
    </div>
  )
}
