
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { CVEList } from '@/components/cve-list';
import { SEO } from '@/components/seo';
import { getAuthenticatedUser } from '@/lib/auth';
import type { Bookmark } from '@shared/schema';

export default function VulnerabilitiesPage() {
    const [location, setLocation] = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Get authenticated user
    const user = getAuthenticatedUser();

    // Fetch bookmarks for header
    const { data: bookmarks = [] } = useQuery<Bookmark[]>({
        queryKey: ['/api/bookmarks'],
        enabled: !!user && !!user.token,
    });

    const handleSearch = (query: string) => {
        // Navigate to threatfeed with search query
        setLocation(`/threatfeed?search=${encodeURIComponent(query)}`);
    };

    const handleBookmarksClick = () => {
        setLocation('/threatfeed?view=bookmarks');
    };

    const handleSidebarToggle = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleSidebarClose = () => {
        setIsSidebarOpen(false);
    };

    const navigateToFeed = (params?: Record<string, string>) => {
        const query = params ? `?${new URLSearchParams(params).toString()}` : '';
        setLocation(`/threatfeed${query}`);
    };

    return (
        <div className="min-h-screen bg-whatcyber-darker text-slate-100 flex flex-col">
            <SEO
                title="Latest Vulnerabilities (CVEs) | WhatCyber"
                description="Browse the latest Common Vulnerabilities and Exposures (CVEs). Stay updated on security flaws and potential exploits."
                keywords="CVE, vulnerabilities, security flaws, exploit, cvss, nvd"
            />

            <Header
                onSearch={handleSearch}
                bookmarkCount={bookmarks.length}
                onBookmarksClick={handleBookmarksClick}
                onSidebarToggle={handleSidebarToggle}
                isSidebarOpen={isSidebarOpen}
            />

            <div className="flex flex-1 min-h-0 relative">
                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                        onClick={handleSidebarClose}
                    />
                )}

                {/* Sidebar */}
                <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } fixed left-0 top-16 h-[calc(100vh-4rem)] z-30 lg:relative lg:translate-x-0 lg:z-10 lg:top-0 lg:h-full transition-transform duration-300 ease-in-out`}>
                    <Sidebar
                        selectedSource="all"
                        onSourceSelect={(source) => navigateToFeed({ source })}
                        timeFilter="all"
                        onTimeFilterChange={(filter) => navigateToFeed({ timeFilter: filter })}
                        threatFilters={[]}
                        onThreatFilterChange={(filters) => navigateToFeed({ threatFilters: filters.join(',') })}
                        onClose={handleSidebarClose}
                        onVulnerabilitiesClick={() => { }} // Already on vulnerabilities page
                        onFollowSourcesClick={() => navigateToFeed({ view: 'followSources' })}
                        onBookmarksClick={() => navigateToFeed({ view: 'bookmarks' })}
                    />
                </div>

                <main className="flex-1 overflow-y-auto bg-whatcyber-darker">
                    <CVEList />
                </main>
            </div>
        </div>
    );
}
