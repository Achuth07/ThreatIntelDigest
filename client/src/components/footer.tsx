import { useEffect, useState } from 'react';
import { Link } from 'wouter';

export function Footer() {
  return (
    <footer className="py-6 md:px-8 md:py-0 border-t">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 WhatCyber.com. All rights reserved.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <Link className="text-sm text-muted-foreground hover:text-foreground transition-colors" href="/contact">
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}