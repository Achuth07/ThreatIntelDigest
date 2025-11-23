import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Check, ChevronRight, Shield, User, Briefcase, GraduationCap, Lock, Globe, Server, Wifi, Eye, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Step 1 Options
const ROLES = [
    { id: "student", label: "Student", icon: GraduationCap },
    { id: "soc_analyst", label: "SOC Analyst", icon: Shield },
    { id: "pentester", label: "Pentester", icon: Lock },
    { id: "security_engineer", label: "Security Engineer", icon: Server },
    { id: "manager_ciso", label: "Manager/CISO", icon: Briefcase },
    { id: "enthusiast", label: "Enthusiast", icon: User },
];

// Step 2 Options
const TOPICS = [
    "Ransomware",
    "Cloud Security",
    "AI & ML",
    "Network Security",
    "Malware",
    "Critical Infra",
    "Privacy",
    "Zero Trust",
    "IoT Security",
    "Threat Intelligence"
];

// Step 3 Options (Mock Data)
const RECOMMENDED_SOURCES = [
    { id: "bleeping_computer", name: "BleepingComputer", url: "bleepingcomputer.com" },
    { id: "the_hacker_news", name: "The Hacker News", url: "thehackernews.com" },
    { id: "cisa", name: "CISA", url: "cisa.gov" },
    { id: "dark_reading", name: "Dark Reading", url: "darkreading.com" },
    { id: "krebs_on_security", name: "Krebs on Security", url: "krebsonsecurity.com" },
];

export default function OnboardingFlow() {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState<string | null>(null);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [followedSources, setFollowedSources] = useState<string[]>([]);
    const [, setLocation] = useLocation();

    const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
    // const prevStep = () => setStep((prev) => Math.max(prev - 1, 1)); // Optional: Back button

    const toggleTopic = (topic: string) => {
        setSelectedTopics((prev) =>
            prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
        );
    };

    const toggleSource = (sourceId: string) => {
        setFollowedSources((prev) =>
            prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
        );
    };

    const handleFinish = async () => {
        // TODO: Submit data to API
        console.log({ role, selectedTopics, followedSources });
        setLocation("/threatfeed");
    };

    const variants = {
        enter: { x: 20, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -20, opacity: 0 },
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-2xl">
                <div className="mb-8 flex justify-between items-center px-2">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} className={cn("h-2 w-12 rounded-full transition-colors", s <= step ? "bg-primary" : "bg-muted")} />
                        ))}
                    </div>
                    <span className="text-sm text-muted-foreground">Step {step} of 4</span>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle>What best describes you?</CardTitle>
                                    <CardDescription>Select the role that fits you best to personalize your experience.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {ROLES.map((r) => {
                                            const Icon = r.icon;
                                            const isSelected = role === r.id;
                                            return (
                                                <div
                                                    key={r.id}
                                                    onClick={() => setRole(r.id)}
                                                    className={cn(
                                                        "cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center justify-center gap-3 transition-all hover:border-primary/50",
                                                        isSelected ? "border-primary bg-primary/5" : "border-muted bg-card"
                                                    )}
                                                >
                                                    <Icon className={cn("h-8 w-8", isSelected ? "text-primary" : "text-muted-foreground")} />
                                                    <span className={cn("font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>{r.label}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <Button onClick={nextStep} disabled={!role}>
                                            Next <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle>What topics interest you?</CardTitle>
                                    <CardDescription>Select all that apply. We'll curate your feed based on these.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-3">
                                        {TOPICS.map((topic) => {
                                            const isSelected = selectedTopics.includes(topic);
                                            return (
                                                <Badge
                                                    key={topic}
                                                    variant={isSelected ? "default" : "outline"}
                                                    className="cursor-pointer text-sm py-2 px-4 hover:bg-primary/90"
                                                    onClick={() => toggleTopic(topic)}
                                                >
                                                    {topic}
                                                    {isSelected && <Check className="ml-2 h-3 w-3" />}
                                                </Badge>
                                            )
                                        })}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <Button onClick={nextStep} disabled={selectedTopics.length === 0}>
                                            Next <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle>Build your feed</CardTitle>
                                    <CardDescription>Follow at least 1 source to get started.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {RECOMMENDED_SOURCES.map((source) => {
                                            const isFollowed = followedSources.includes(source.id);
                                            return (
                                                <div key={source.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                            <Globe className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{source.name}</p>
                                                            <p className="text-xs text-muted-foreground">{source.url}</p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        checked={isFollowed}
                                                        onCheckedChange={() => toggleSource(source.id)}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <Button onClick={nextStep} disabled={followedSources.length === 0}>
                                            Next <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div
                            key="step4"
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                            className="text-center"
                        >
                            <Card className="border-none shadow-none bg-transparent">
                                <CardContent className="pt-10 flex flex-col items-center">
                                    <div className="h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                                        <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h2 className="text-3xl font-bold mb-2">Your feed is ready!</h2>
                                    <p className="text-muted-foreground max-w-md mx-auto mb-8">
                                        We've personalized your experience based on your preferences. You can always adjust these settings later.
                                    </p>
                                    <Button size="lg" onClick={handleFinish} className="w-full max-w-xs">
                                        Go to Threat Feed
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
