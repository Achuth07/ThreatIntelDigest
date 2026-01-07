
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, Mail, Facebook, Linkedin } from "lucide-react";

interface ShareButtonProps {
    articleUrl: string;
    articleTitle: string;
    className?: string; // Allow custom styling positioning
    align?: "start" | "end" | "center";
    side?: "top" | "right" | "bottom" | "left";
}

export function ShareButton({ articleUrl, articleTitle, className, align = "end", side = "bottom" }: ShareButtonProps) {
    const encodedUrl = encodeURIComponent(articleUrl);
    const suffix = " -- via WhatCyber threadfeed";

    // For Twitter/Threads: "Title URL Suffix"
    // We include the URL in the text parameter to ensure the order, and don't pass a separate URL param for Twitter 
    // to avoid duplication or forced ordering (though Twitter might still auto-detect the link for a card).
    const textWithUrlAndSuffix = `${articleTitle} ${articleUrl}${suffix}`;
    const encodedText = encodeURIComponent(textWithUrlAndSuffix);

    const emailBody = encodeURIComponent(`${articleTitle}\n\n${articleUrl}\n\n${suffix}`);

    const shareLinks = {
        // Omitting 'url' param and putting it in 'text' to control order: Title -> URL -> Suffix
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
        threads: `https://www.threads.net/intent/post?text=${encodedText}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        email: `mailto:?subject=${encodeURIComponent(articleTitle)}&body=${emailBody}`,
    };

    const handleShare = (network: string, url: string) => {
        if (network === 'email') {
            window.location.href = url;
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={className}
                    title="Share article"
                >
                    <Share2 className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} side={side} className="w-48 bg-slate-900 border-slate-700">
                <DropdownMenuItem
                    className="cursor-pointer text-slate-300 focus:text-slate-100 focus:bg-slate-800"
                    onClick={() => handleShare('twitter', shareLinks.twitter)}
                >
                    {/* X Icon SVG */}
                    <svg className="w-4 h-4 mr-2 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Twitter / X
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer text-slate-300 focus:text-slate-100 focus:bg-slate-800"
                    onClick={() => handleShare('threads', shareLinks.threads)}
                >
                    {/* Threads Icon SVG */}
                    <svg className="w-4 h-4 mr-2 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15.158 2.392a12.183 12.183 0 0 0-3.344-.455c-1.479 0-3.376.26-4.997 1.054-4.524 2.147-6.52 7.556-4.321 11.69 1.487 2.766 4.298 4.276 7.625 4.318 4.604.057 7.732-3.23 7.842-7.532.073-2.903-1.288-5.37-4.045-6.095-2.222-.57-4.634.34-5.362 2.45-.632 1.761.055 3.903 1.933 4.887 1.402.722 3.233.279 3.945-1.144.254-.492.29-1.218.188-1.572-.32.063-.642.106-.948.14-1.782.25-2.607-1.146-2.07-2.628.275-.76.945-1.29 1.695-1.446 1.109-.228 2.247.398 2.592 1.547.464 1.53.076 3.141-.83 4.286-1.167 1.442-3.15 1.954-4.63 1.255-1.897-.886-2.583-3.08-1.92-5.068 1.142-3.414 4.183-5.26 7.466-4.93 2.102.215 3.738 1.419 4.256 3.39 1.052 4.098-1.547 8.356-5.83 8.328-2.636-.026-4.858-1.196-6.046-3.364-1.748-3.27.08-7.794 3.666-9.522 1.309-.652 2.85-.85 4.048-.85.766 0 1.45.05 2.112.156l.462-1.815zM11.96 11.478c-.286-.06-.59-.033-.872.065-.544.19-.853.76-.69 1.305.111.41.4.733.805.856.545.19 1.127-.14 1.32-.705.176-.53-.138-1.143-.564-1.52z" />
                    </svg>
                    Threads
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer text-slate-300 focus:text-slate-100 focus:bg-slate-800"
                    onClick={() => handleShare('linkedin', shareLinks.linkedin)}
                >
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer text-slate-300 focus:text-slate-100 focus:bg-slate-800"
                    onClick={() => handleShare('facebook', shareLinks.facebook)}
                >
                    <Facebook className="w-4 h-4 mr-2" />
                    Facebook
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer text-slate-300 focus:text-slate-100 focus:bg-slate-800"
                    onClick={() => handleShare('email', shareLinks.email)}
                >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
