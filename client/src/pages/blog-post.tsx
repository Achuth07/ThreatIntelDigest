
import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { client, urlFor } from '@/lib/sanity';
import { Header } from '@/components/header';
import { SEO } from '@/components/seo';
import { PortableText } from '@portabletext/react';
import { Calendar, User, ChevronLeft, Clock, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';

interface PostDetail {
    _id: string;
    title: string;
    slug: { current: string };
    mainImage: any;
    publishedAt: string;
    excerpt: string;
    author: {
        name: string;
        image: any;
        bio: any;
    };
    categories: {
        title: string;
    }[];
    body: any;
    seoTitle?: string;
    seoDescription?: string;
}

const portableTextComponents = {
    types: {
        image: ({ value }: any) => {
            if (!value?.asset?._ref) {
                return null;
            }
            return (
                <figure className="my-8">
                    <img
                        alt={value.alt || ' '}
                        loading="lazy"
                        src={urlFor(value).width(800).fit('max').auto('format').url()}
                        className="rounded-lg w-full object-cover max-h-[500px]"
                    />
                    {value.caption && (
                        <figcaption className="mt-2 text-center text-sm text-slate-400 italic">
                            {value.caption}
                        </figcaption>
                    )}
                </figure>
            );
        },
        table: ({ value }: any) => {
            return (
                <div className="my-8 overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-700">
                        <tbody>
                            {value.rows.map((row: any, rowIndex: number) => (
                                <tr key={row._key} className={rowIndex === 0 ? "bg-slate-800" : "even:bg-slate-800/30"}>
                                    {row.cells.map((cell: string, cellIndex: number) => (
                                        <td
                                            key={`${row._key}-${cellIndex}`}
                                            className={`p-3 border border-slate-700 text-slate-300 ${rowIndex === 0 ? "font-bold text-slate-100" : ""}`}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        },
    },
    block: {
        h1: ({ children }: any) => <h1 className="text-3xl font-bold text-slate-100 mt-10 mb-4">{children}</h1>,
        h2: ({ children }: any) => <h2 className="text-2xl font-bold text-slate-100 mt-8 mb-4 border-b border-slate-700 pb-2">{children}</h2>,
        h3: ({ children }: any) => <h3 className="text-xl font-bold text-slate-100 mt-6 mb-3">{children}</h3>,
        h4: ({ children }: any) => <h4 className="text-lg font-bold text-slate-100 mt-4 mb-2">{children}</h4>,
        normal: ({ children }: any) => <p className="text-slate-300 leading-relaxed mb-4 text-lg">{children}</p>,
        blockquote: ({ children }: any) => (
            <blockquote className="border-l-4 border-whatcyber-teal pl-4 py-1 my-6 text-slate-300 italic bg-slate-800/50 rounded-r-lg p-4">
                {children}
            </blockquote>
        ),
    },
    list: {
        bullet: ({ children }: any) => <ul className="list-disc pl-6 mb-6 text-slate-300 space-y-2">{children}</ul>,
        number: ({ children }: any) => <ol className="list-decimal pl-6 mb-6 text-slate-300 space-y-2">{children}</ol>,
    },
    marks: {
        link: ({ children, value }: any) => {
            const rel = !value.href.startsWith('/') ? 'noreferrer noopener' : undefined;
            return (
                <a
                    href={value.href}
                    rel={rel}
                    className="text-whatcyber-teal hover:underline font-medium"
                >
                    {children}
                </a>
            );
        },
    },
};

export default function BlogPost() {
    const [, params] = useRoute('/blog/:slug');
    const [post, setPost] = useState<PostDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!params?.slug) return;

        const fetchPost = async () => {
            try {
                const query = `*[_type == "post" && slug.current == $slug][0] {
          _id,
          title,
          slug,
          mainImage,
          publishedAt,
          excerpt,
          body,
          seoTitle,
          seoDescription,
          author->{
            name,
            image,
            bio
          },
          categories[]->{
            title
          }
        }`;

                const data = await client.fetch(query, { slug: params.slug });
                setPost(data);
            } catch (error) {
                console.error("Failed to fetch blog post:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [params?.slug]);

    const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);
    const handleSidebarClose = () => setIsSidebarOpen(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-whatcyber-darker flex flex-col">
                <Header
                    onSearch={() => { }}
                    bookmarkCount={0}
                    onBookmarksClick={() => { }}
                    onSidebarToggle={handleSidebarToggle}
                    isSidebarOpen={isSidebarOpen}
                />
                <div className="max-w-3xl mx-auto px-4 w-full py-12 space-y-8">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-[400px] w-full rounded-xl" />
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-whatcyber-darker flex flex-col items-center justify-center text-slate-300">
                <h1 className="text-2xl font-bold mb-4">Post not found</h1>
                <Link href="/blog">
                    <Button>Back to Blog</Button>
                </Link>
            </div>
        );
    }

    // Structured Data (JSON-LD)
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.seoTitle || post.title,
        "image": post.mainImage ? [urlFor(post.mainImage).width(1200).height(630).url()] : [],
        "datePublished": post.publishedAt,
        "dateModified": post.publishedAt, // Or updatedAt if available
        "author": [{
            "@type": "Person",
            "name": post.author?.name || "WhatCyber Team",
            "url": "https://www.whatcyber.com"
        }]
    };

    // Smart Keyword Generation
    const generateKeywords = (post: PostDetail) => {
        const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'from', 'about', 'this', 'that', 'these', 'those', 'such', 'into', 'over', 'under', 'between', 'how', 'what', 'why', 'when', 'where', 'which', 'who', 'whom']);

        // Helper to clean and split text
        const extractWords = (text: string) => {
            if (!text) return [];
            return text
                .toLowerCase()
                .replace(/[^\w\s-]/g, '') // Keep hyphens for things like CVE-2024-1234
                .split(/\s+/)
                .filter(word => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word)); // Filter pure numbers
        };

        // 1. Extract from Title (High priority)
        const titleWords = extractWords(post.title);

        // 2. Extract from Excerpt (Medium priority)
        const excerptWords = extractWords(post.excerpt);

        // 3. Simple Named Entity Recognition (Find capitalized words in excerpt not starting sentences)
        // This regex looks for Capitalized words that follow a space (not start of string)
        const potentialEntities = (post.excerpt?.match(/(?<= )\b[A-Z][a-zA-Z0-9-]+\b/g) || [])
            .map(w => w.toLowerCase())
            .filter(w => !stopWords.has(w) && w.length > 2);

        // 4. Get Categories (Highest Priority)
        const categoryWords = post.categories?.map(c => c.title.toLowerCase()) || [];

        // Combine weighted strategy: Categories > Title > Entities > Excerpt common words
        // We use a Set to dedupe while preserving order of insertion
        const keywordsSet = new Set([
            ...categoryWords,
            ...potentialEntities,
            ...titleWords,
            ...excerptWords.slice(0, 10) // Only take top 10 distinct words from excerpt to avoid noise
        ]);

        return Array.from(keywordsSet).join(', ');
    };

    const seoProps = {
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt,
        image: post.mainImage ? urlFor(post.mainImage).width(1200).height(630).url() : undefined,
        url: `https://www.whatcyber.com/blog/${post.slug.current}`,
        type: "article",
        keywords: generateKeywords(post),
        structuredData
    };

    return (
        <div className="min-h-screen bg-whatcyber-darker text-slate-100 flex flex-col">
            <SEO {...seoProps} />

            <Header
                onSearch={() => { }}
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

                <main className="flex-1 overflow-y-auto bg-whatcyber-darker" id="blog-content">
                    {/* Progress Bar could be added here */}

                    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12">

                        <div className="mb-8">
                            <Link href="/blog">
                                <Button variant="ghost" className="pl-0 text-slate-400 hover:text-whatcyber-teal hover:bg-transparent">
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Back to Blog
                                </Button>
                            </Link>
                        </div>

                        <header className="mb-10 text-center md:text-left">
                            <div className="flex flex-wrap gap-2 mb-6 justify-center md:justify-start">
                                {post.categories?.map((cat, idx) => (
                                    <span key={idx} className="bg-whatcyber-teal/10 text-whatcyber-teal text-sm px-3 py-1 rounded-full border border-whatcyber-teal/20 font-medium">
                                        {cat.title}
                                    </span>
                                ))}
                            </div>

                            <h1 className="text-3xl md:text-5xl font-bold text-slate-100 mb-6 leading-tight">
                                {post.title}
                            </h1>

                            <div className="flex flex-col md:flex-row md:items-center text-slate-400 gap-4 md:gap-8 border-b border-slate-700/50 pb-8">
                                {post.author && (
                                    <div className="flex items-center">
                                        {post.author.image ? (
                                            <img
                                                src={urlFor(post.author.image).width(40).height(40).url()}
                                                alt={post.author.name}
                                                className="w-10 h-10 rounded-full mr-3 border border-slate-600"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center mr-3">
                                                <User className="w-5 h-5 text-slate-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">Written by</p>
                                            <p className="text-sm font-semibold text-whatcyber-teal">{post.author.name}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center mr-3 border border-slate-700">
                                        <CalendarIcon className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">Published on</p>
                                        <p className="text-sm text-slate-400">
                                            {new Date(post.publishedAt).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {post.mainImage && (
                            <div className="mb-12 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50">
                                <img
                                    src={urlFor(post.mainImage).width(1200).height(600).url()}
                                    alt={post.title}
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        )}

                        <div className="prose prose-invert prose-lg max-w-none text-slate-300">
                            <PortableText
                                value={post.body}
                                components={portableTextComponents}
                            />
                        </div>

                        {/* Author Bio Section */}
                        {post.author && post.author.bio && (
                            <div className="mt-16 pt-8 border-t border-slate-700">
                                <div className="bg-slate-800/30 rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                                    {post.author.image && (
                                        <img
                                            src={urlFor(post.author.image).width(100).height(100).url()}
                                            alt={post.author.name}
                                            className="w-24 h-24 rounded-full border-2 border-whatcyber-teal/30"
                                        />
                                    )}
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-100 mb-2">About {post.author.name}</h3>
                                        <div className="text-slate-400 text-sm">
                                            <PortableText value={post.author.bio} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </article>
                </main>
            </div>
        </div>
    );
}
