
import * as React from "react";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    FileText,
    ShieldAlert,
    Skull,
    Bug,
    Globe
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useDebounce } from "@/hooks/use-debounce";
// Assuming useDebounce exists or I need to create it/use generic logic

interface SearchResults {
    articles: any[];
    cves: any[];
    kevs: any[];
    threat_actors: any[];
}

export function CommandPalette({
    open,
    setOpen,
}: {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const [query, setQuery] = React.useState("");
    const debouncedQuery = useDebounce(query, 300); // 300ms debounce
    const [, setLocation] = useLocation();

    const { data: results, isLoading } = useQuery<SearchResults>({
        queryKey: ['global-search', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery) return { articles: [], cves: [], kevs: [], threat_actors: [] };
            const res = await fetch(`/api/global-search?q=${encodeURIComponent(debouncedQuery)}`);
            if (!res.ok) throw new Error("Failed to fetch search results");
            return res.json();
        },
        enabled: debouncedQuery.length > 0,
    });

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [setOpen]);

    const handleSelect = (callback: () => void) => {
        callback();
        setOpen(false);
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Search articles, CVEs, threat actors..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {/* Articles */}
                {results?.articles && results.articles.length > 0 && (
                    <CommandGroup heading="Articles">
                        {results.articles.map((article) => (
                            <CommandItem
                                key={article.id}
                                onSelect={() => handleSelect(() => {
                                    // Navigate to article or external URL
                                    setLocation(`/article/${article.id}`);
                                })}
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                <span>{article.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* KEVs */}
                {results?.kevs && results.kevs.length > 0 && (
                    <CommandGroup heading="Exploited Vulnerabilities (KEVs)">
                        {results.kevs.map((kev) => (
                            <CommandItem
                                key={kev.cveID}
                                onSelect={() => handleSelect(() => setLocation(`/exploited-vulnerabilities/${kev.cveID}`))}
                            >
                                <ShieldAlert className="mr-2 h-4 w-4 text-red-500" />
                                <span>{kev.cveID} - {kev.vulnerabilityName}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* CVEs */}
                {results?.cves && results.cves.length > 0 && (
                    <CommandGroup heading="CVEs">
                        {results.cves.map((cve) => (
                            <CommandItem
                                key={cve.id}
                                // Determine if we have a detailed view for generic CVEs or just KEVs
                                // Existing routes show /exploited-vulnerabilities/:id
                                // We might want to just show basic info or link to NVD if no local page
                                // For now, let's assume we can view them if we have them
                                onSelect={() => handleSelect(() => setLocation(`/vulnerabilities/${cve.id}`))}
                            >
                                <Bug className="mr-2 h-4 w-4" />
                                <span>{cve.id}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* Threat Actors */}
                {results?.threat_actors && results.threat_actors.length > 0 && (
                    <CommandGroup heading="Threat Actors">
                        {results.threat_actors.map((actor) => (
                            <CommandItem
                                key={actor.id}
                                onSelect={() => handleSelect(() => setLocation(`/threat-actors/${actor.id}`))}
                            >
                                <Skull className="mr-2 h-4 w-4" />
                                <span>{actor.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {debouncedQuery && (
                    <CommandGroup heading="Actions">
                        <CommandItem onSelect={() => handleSelect(() => window.location.href = `/threatfeed?search=${encodeURIComponent(debouncedQuery)}`)}>
                            <Search className="mr-2 h-4 w-4" />
                            <span>Search all articles for "{debouncedQuery}"</span>
                        </CommandItem>
                    </CommandGroup>
                )}

            </CommandList>
        </CommandDialog>
    );
}
