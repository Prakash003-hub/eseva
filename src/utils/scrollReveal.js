import { useEffect } from 'react';

/**
 * High-performance Scroll-Triggered Motion UI Animation System
 * Each time the user scrolls from top to bottom, elements smoothly animate into view.
 * When elements leave the viewport to the bottom (e.g. user scrolls back up),
 * their animation state resets off-screen so scrolling down triggers the animation again.
 * Complies with prefers-reduced-motion and maintains 60fps performance.
 */

const SELECTOR = '[data-scroll-reveal], .scroll-reveal, .scroll-reveal-fade, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale';

export function initScrollReveal(rootContainer = null) {
  if (typeof window === 'undefined') return () => {};

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = rootContainer || document;

  if (prefersReducedMotion) {
    const all = container.querySelectorAll(SELECTOR);
    all.forEach(el => el.classList.add('is-revealed'));
    return () => {};
  }

  if (!('IntersectionObserver' in window)) {
    const all = container.querySelectorAll(SELECTOR);
    all.forEach(el => el.classList.add('is-revealed'));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        } else {
          // If the element exited the viewport to the bottom (i.e. user scrolled up past it)
          // reset its state off-screen so scrolling top-to-bottom reveals it again with animation!
          if (entry.boundingClientRect.top > 0) {
            entry.target.classList.remove('is-revealed');
          }
        }
      });
    },
    {
      root: null, // viewport
      rootMargin: '0px 0px -20px 0px',
      threshold: 0.05
    }
  );

  const observeElements = () => {
    const elements = container.querySelectorAll(SELECTOR);
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= viewportHeight && rect.bottom >= 0) {
        el.classList.add('is-revealed');
      } else if (rect.top > viewportHeight) {
        // Below viewport, ensure clean reset for top-to-bottom scroll reveal
        el.classList.remove('is-revealed');
      }
      observer.observe(el);
    });
  };

  // Run initial observation
  observeElements();

  // Scroll reset helper: when user scrolls back to top,
  // ensure all elements below viewport are reset to animate smoothly on each top-to-bottom scroll
  const handleScrollReset = () => {
    const currentScrollY = window.scrollY || (document.querySelector('.mobile-frame-content')?.scrollTop || 0);
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    if (currentScrollY <= 15) {
      const elements = container.querySelectorAll(SELECTOR);
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top > viewportHeight) {
          el.classList.remove('is-revealed');
        }
      });
    }
  };

  window.addEventListener('scroll', handleScrollReset, { passive: true });
  const frameContent = document.querySelector('.mobile-frame-content');
  if (frameContent) {
    frameContent.addEventListener('scroll', handleScrollReset, { passive: true });
  }

  // MutationObserver to capture dynamically rendered items (e.g., loaded posts, forms, jobs)
  const mutationTarget = rootContainer || document.body;
  let mutationObserver = null;

  if (typeof MutationObserver !== 'undefined' && mutationTarget) {
    mutationObserver = new MutationObserver(() => {
      observeElements();
    });

    mutationObserver.observe(mutationTarget, {
      childList: true,
      subtree: true
    });
  }

  // Cleanup on unmount
  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', handleScrollReset);
    if (frameContent) {
      frameContent.removeEventListener('scroll', handleScrollReset);
    }
    if (mutationObserver) mutationObserver.disconnect();
  };
}

/**
 * React Hook for scroll reveal across view re-renders or tab switches
 */
export function useScrollReveal(deps = []) {
  useEffect(() => {
    const cleanup = initScrollReveal();
    return cleanup;
  }, deps);
}
