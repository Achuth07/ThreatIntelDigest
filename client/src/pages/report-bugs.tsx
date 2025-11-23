import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ReportBugs() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            message: "",
        },
    });

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            const response = await fetch("https://formspree.io/f/xeodwkng", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                toast({
                    title: "Feedback Sent",
                    description: "Thank you for your feedback! We'll look into it.",
                });
                form.reset();
            } else {
                throw new Error("Failed to send feedback");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send feedback. Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-whatcyber-darker p-4 md:p-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl">
                <Button
                    variant="ghost"
                    className="mb-6 text-slate-400 hover:text-slate-100 pl-0 hover:bg-transparent"
                    onClick={() => setLocation("/threatfeed")}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Threat Feed
                </Button>

                <Card className="bg-whatcyber-dark border-whatcyber-light-gray/30">
                    <CardHeader>
                        <CardTitle className="text-2xl text-slate-100">Report Bugs & Feedback</CardTitle>
                        <CardDescription className="text-slate-400">
                            Found a bug or have a suggestion? Let us know!
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-300">Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Your name"
                                                    {...field}
                                                    className="bg-slate-800 border-slate-700 text-slate-100 focus:border-whatcyber-teal"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-300">Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="your.email@example.com"
                                                    {...field}
                                                    className="bg-slate-800 border-slate-700 text-slate-100 focus:border-whatcyber-teal"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-300">Message</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe the bug or share your feedback..."
                                                    className="min-h-[150px] bg-slate-800 border-slate-700 text-slate-100 focus:border-whatcyber-teal"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    className="w-full bg-whatcyber-teal hover:bg-whatcyber-teal/90 text-whatcyber-dark font-medium"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        "Sending..."
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Send Feedback
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
