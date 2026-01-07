
import { useState, useEffect } from 'react';
import { client } from '@/lib/sanity';
import { BlogCard, BlogPost } from '@/components/blog-card';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { SEO } from '@/components/seo';
import { ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

export default function Blog() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const query = `*[_type == "post"] | order(publishedAt desc) {
          _id,
          title,
          slug,
          mainImage,
          publishedAt,
          excerpt,
          author->{
            name,
            image
          },
          categories[]->{
            title
          }
        }`;

                const data = await client.fetch(query);
                setPosts(data);
            } catch (error) {
                console.error("Failed to fetch blog posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);
    const handleSidebarClose = () => setIsSidebarOpen(false);

    // SEO Configuration
    const seoProps = {
        title: "WhatCyber Blog - Cybersecurity Insights & Industry Updates",
        description: "Read the latest articles on cybersecurity trends, threat intelligence analysis, and updates from the WhatCyber team.",
        url: "https://www.whatcyber.com/blog",
        type: "website"
    };

    return (
        <div className="min-h-screen bg-whatcyber-darker text-slate-100 flex flex-col">
            <SEO {...seoProps} />

            <Header
                onSearch={() => { }} // Search not implemented for blog yet
                bookmarkCount={0}
                onBookmarksClick={() => { }}
                onSidebarToggle={handleSidebarToggle}
                isSidebarOpen={isSidebarOpen}
            />

            <div className="flex flex-1 min-h-0 relative">
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                        onClick={handleSidebarClose}
                    />
                )}

                {/* Sidebar (Optional for Blog, kept for consistency if needed, or can be removed) */}
                <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } fixed left-0 top-16 h-[calc(100vh-4rem)] z-30 lg:hidden transition-transform duration-300 ease-in-out`}>
                    {/* Simple mobile navigation for now */}
                    <div className="w-64 h-full bg-whatcyber-dark border-r border-slate-700 p-4">
                        <Link href="/threatfeed">
                            <div className="flex items-center text-slate-300 mb-4 cursor-pointer hover:text-whatcyber-teal">
                                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                                Back to Threat Feed
                            </div>
                        </Link>
                    </div>
                </div>


                <main className="flex-1 overflow-y-auto bg-whatcyber-darker">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-3">
                                    Latest Security Insights
                                </h1>
                                <p className="text-slate-400 text-lg max-w-2xl">
                                    Expert analysis, industry news, and updates from the WhatCyber team.
                                </p>
                            </div>

                            <div className="mt-4 md:mt-0">
                                {/* Could add category filters here later */}
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-96 bg-slate-800/50 rounded-xl animate-pulse border border-slate-700/50"></div>
                                ))}
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-20 bg-slate-800/30 rounded-xl border border-slate-700/50 border-dashed">
                                <h3 className="text-xl text-slate-300 font-medium mb-2">No posts published yet</h3>
                                <p className="text-slate-500">Check back soon for updates!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {posts.map((post) => (
                                    <BlogCard key={post._id} post={post} />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
