'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('snf_vid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('snf_vid', id);
  }
  return id;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('snf_sid');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('snf_sid', id);
  }
  return id;
}

export function PageTracker() {
  const pathname = usePathname();
  const lastPath = useRef('');
  const pageStart = useRef(Date.now());

  useEffect(() => {
    if (pathname === lastPath.current) return;

    // Send duration for previous page via beacon
    if (lastPath.current) {
      const duration = Math.round((Date.now() - pageStart.current) / 1000);
      if (duration > 0 && duration < 3600) {
        navigator.sendBeacon(
          '/api/analytics/track',
          JSON.stringify({
            path: lastPath.current,
            visitorId: getVisitorId(),
            sessionId: getSessionId(),
            duration,
          })
        );
      }
    }

    // Track new page view
    lastPath.current = pathname;
    pageStart.current = Date.now();

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [pathname]);

  // Send duration on page unload
  useEffect(() => {
    const handleUnload = () => {
      const duration = Math.round((Date.now() - pageStart.current) / 1000);
      if (lastPath.current && duration > 0 && duration < 3600) {
        navigator.sendBeacon(
          '/api/analytics/track',
          JSON.stringify({
            path: lastPath.current,
            visitorId: getVisitorId(),
            sessionId: getSessionId(),
            duration,
          })
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return null;
}
