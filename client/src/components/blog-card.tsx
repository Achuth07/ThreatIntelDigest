
import { Link } from "wouter";
import { urlFor } from "@/lib/sanity";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface BlogPost {
    _id: string;
    title: string;
    slug: { current: string };
    mainImage: any;
    publishedAt: string;
    excerpt: string;
    author: {
        name: string;
        image: any;
    };
    categories: {
        title: string;
    }[];
}

interface BlogCardProps {
    post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
    return (
        <Card className="flex flex-col h-full bg-slate-800 border-slate-700 overflow-hidden hover:border-whatcyber-teal/50 transition-colors duration-300">
            <div className="relative aspect-video overflow-hidden bg-slate-900">
                {post.mainImage ? (
                    <img
                        src={urlFor(post.mainImage).width(800).height(450).url()}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-500">
                        <span>No Image</span>
                    </div>
                )}

                {post.categories && post.categories.length > 0 && (
                    <div className="absolute top-4 left-4 flex gap-2">
                        {post.categories.map((cat, idx) => (
                            <span key={idx} className="bg-whatcyber-dark/80 backdrop-blur-sm text-whatcyber-teal text-xs px-2 py-1 rounded-md font-medium border border-whatcyber-teal/20">
                                {cat.title}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <CardHeader className="flex-1 p-5 pb-0">
                <h3 className="text-xl font-bold text-slate-100 mb-2 line-clamp-2 hover:text-whatcyber-teal transition-colors">
                    <Link href={`/blog/${post.slug.current}`}>
                        {post.title}
                    </Link>
                </h3>
                <div className="flex items-center space-x-4 text-xs text-slate-400 mb-3">
                    <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        {new Date(post.publishedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                    {post.author && (
                        <div className="flex items-center">
                            <User className="w-3.5 h-3.5 mr-1" />
                            {post.author.name}
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-5 pt-2 flex-grow">
                <p className="text-slate-400 text-sm line-clamp-3">
                    {post.excerpt || "Read more about this topic..."}
                </p>
            </CardContent>

            <CardFooter className="p-5 pt-0 mt-auto">
                <Link href={`/blog/${post.slug.current}`}>
                    <Button
                        variant="ghost"
                        className="text-whatcyber-teal hover:text-whatcyber-teal hover:bg-whatcyber-teal/10 p-0 h-auto font-medium group"
                    >
                        Read Article
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
