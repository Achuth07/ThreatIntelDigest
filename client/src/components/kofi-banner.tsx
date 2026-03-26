import React, { useState, useEffect } from 'react';
import { X, Heart } from 'lucide-react';
import { useLocation } from 'wouter';

export function KofiBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    // Check if user has previously dismissed the banner
    const isDismissed = localStorage.getItem('kofi-banner-dismissed');
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('kofi-banner-dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible || location === '/') return null;

  return (
    <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-gradient-to-r from-whatcyber-dark via-whatcyber-gray to-whatcyber-dark px-6 py-2.5 sm:px-3.5 sm:before:flex-1 border-b border-whatcyber-teal/20 mx-auto z-[100] w-full shadow-md">
      <div
        className="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        aria-hidden="true"
      >
        <div
          className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-whatcyber-teal to-[#00ff88] opacity-10"
          style={{
            clipPath:
              'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
          }}
        />
      </div>
      <div
        className="absolute left-[max(45rem,calc(50%+8rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        aria-hidden="true"
      >
        <div
          className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-whatcyber-teal to-[#00ff88] opacity-10"
          style={{
            clipPath:
              'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm leading-6 text-slate-200">
          <strong className="font-semibold text-white flex items-center gap-2">
            <Heart className="h-4 w-4 text-whatcyber-teal" fill="currentColor" />
            Support WhatCyber
          </strong>
          <span className="hidden sm:inline"> &mdash; </span>
          WhatCyber is growing! Help us upgrade our servers to handle the new features and keep the platform free.
        </p>
        <a
          href="https://ko-fi.com/whatcyber"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-none rounded-full bg-whatcyber-teal/10 px-3.5 py-1 text-sm font-semibold text-whatcyber-teal shadow-sm hover:bg-whatcyber-teal/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-whatcyber-teal transition-colors border border-whatcyber-teal/30"
        >
          Donate on Ko-fi <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
      <div className="flex flex-1 justify-end">
        <button
          type="button"
          onClick={handleDismiss}
          className="-m-3 p-3 focus-visible:outline-offset-[-4px] text-slate-400 hover:text-white transition-colors"
        >
          <span className="sr-only">Dismiss</span>
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
