import { useState, useEffect } from "react";
import { Plus, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type Operator = "AND" | "OR" | "NOT";

export interface QueryRule {
    id: string;
    operator: Operator;
    term: string;
    isExact: boolean;
}

interface QueryBuilderProps {
    onQueryChange: (query: string) => void;
    initialQuery?: string;
}

export function QueryBuilder({ onQueryChange, initialQuery = "" }: QueryBuilderProps) {
    const [rules, setRules] = useState<QueryRule[]>([
        { id: "1", operator: "AND", term: "", isExact: true }
    ]);

    // Generate query string whenever rules change
    useEffect(() => {
        const query = generateQueryString(rules);
        onQueryChange(query);
    }, [rules, onQueryChange]);

    const generateQueryString = (currentRules: QueryRule[]) => {
        return currentRules
            .filter(r => r.term.trim() !== "")
            .map((r, index) => {
                const term = r.isExact ? `"${r.term}"` : r.term;
                if (index === 0) return term;

                switch (r.operator) {
                    case "AND": return ` ${term}`; // Implicit AND in websearch
                    case "OR": return ` or ${term}`;
                    case "NOT": return ` -${term}`;
                    default: return ` ${term}`;
                }
            })
            .join("");
    };

    const addRule = () => {
        setRules([...rules, { id: Math.random().toString(36).substr(2, 9), operator: "AND", term: "", isExact: true }]);
    };

    const removeRule = (id: string) => {
        if (rules.length <= 1) return; // Prevent removing the last rule
        setRules(rules.filter(r => r.id !== id));
    };

    const updateRule = (id: string, field: keyof QueryRule, value: any) => {
        setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {rules.map((rule, index) => (
                    <div key={rule.id} className="flex gap-2 items-start">
                        <div className="flex-none pt-1">
                            {index > 0 ? (
                                <Select
                                    value={rule.operator}
                                    onValueChange={(val) => updateRule(rule.id, "operator", val as Operator)}
                                >
                                    <SelectTrigger className="w-[80px] bg-slate-800 border-slate-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AND">AND</SelectItem>
                                        <SelectItem value="OR">OR</SelectItem>
                                        <SelectItem value="NOT">NOT</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="w-[80px] flex justify-center py-2 text-xs font-mono text-slate-500 uppercase">Start</div>
                            )}
                        </div>

                        <div className="flex-1 space-y-1">
                            <Input
                                value={rule.term}
                                onChange={(e) => updateRule(rule.id, "term", e.target.value)}
                                placeholder={index === 0 ? "Initial keyword..." : "Next keyword..."}
                                className="bg-slate-800 border-slate-700"
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id={`exact-${rule.id}`}
                                    checked={rule.isExact}
                                    onChange={(e) => updateRule(rule.id, "isExact", e.target.checked)}
                                    className="h-3 w-3 rounded border-slate-700 bg-slate-800 text-whatcyber-teal focus:ring-whatcyber-teal"
                                />
                                <label htmlFor={`exact-${rule.id}`} className="text-xs text-slate-400 cursor-pointer select-none">
                                    Exact phrase
                                </label>
                            </div>
                        </div>

                        {rules.length > 1 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRule(rule.id)}
                                className="h-9 w-9 text-slate-400 hover:text-destructive mt-1"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center pt-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRule}
                    className="border-dashed border-slate-600 text-slate-400 hover:text-slate-200"
                >
                    <Plus className="h-3 w-3 mr-2" />
                    Add Rule
                </Button>

                <div className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800 max-w-[200px] truncate" title={generateQueryString(rules)}>
                    Preview: {generateQueryString(rules) || "(empty)"}
                </div>
            </div>
        </div>
    );
}
