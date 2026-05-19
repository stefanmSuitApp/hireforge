'use client';

import * as React from 'react';

const TARGET_IDS = ['employer-subscriptions', 'employer-package-cards'];

/**
 * Client navigations often skip scrolling to `location.hash`; subscriptions are below the fold.
 */
export function EmployerPackagesHashScroll() {
  React.useEffect(() => {
    const el = () => {
      if (typeof window === 'undefined') return;
      const id = TARGET_IDS.find((x) => `#${x}` === window.location.hash);
      if (id) {
        document.getElementById(id)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    };
    el();
    window.addEventListener('hashchange', el);
    return () => window.removeEventListener('hashchange', el);
  }, []);

  return null;
}
