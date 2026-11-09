import { Link } from 'wouter';

// Site-wide footer. Plain links to every public hub so crawlers can reach them from any page.
const FOOTER_LINKS = [
  { href: '/threatfeed', label: 'Security News Feed' },
  { href: '/cve', label: 'Latest CVEs' },
  { href: '/cisa-kev', label: 'CISA KEV Catalog' },
  { href: '/threat-actors', label: 'Threat Actors' },
  { href: '/blog', label: 'Blog' },
  { href: '/sources', label: 'Sources' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function Footer() {
  return (
    <footer className="py-6 border-t">
      <div className="container flex flex-col items-center gap-4">
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-center text-sm leading-loose text-muted-foreground">
          © {new Date().getFullYear()} WhatCyber.com. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
