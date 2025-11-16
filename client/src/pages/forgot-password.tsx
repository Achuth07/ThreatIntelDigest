import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@/assets/logo/android-chrome-512x512.png';
import { SEO } from '@/components/seo';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/email/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      setEmailSent(true);
      toast({
        title: 'Email Sent',
        description: 'Check your inbox for password reset instructions',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send reset email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-whatcyber-dark flex items-center justify-center p-4">
        <SEO 
          title="Password Reset Email Sent - WhatCyber ThreatFeed"
          description="Password reset instructions have been sent to your email. Check your inbox to reset your password."
          keywords="password reset, email sent, cybersecurity, threat intelligence, CVE, vulnerabilities"
        />
        <Card className="w-full max-w-md bg-whatcyber-dark border-whatcyber-light-gray">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-100">Check Your Email</CardTitle>
            <CardDescription className="text-slate-400">
              We've sent password reset instructions to <strong className="text-slate-300">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300 text-sm text-center">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
            <p className="text-slate-400 text-xs text-center">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                className="text-whatcyber-teal hover:underline"
                onClick={() => setEmailSent(false)}
              >
                try again
              </button>
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-whatcyber-teal hover:bg-whatcyber-teal/80"
              onClick={() => navigate('/login/')}
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-whatcyber-dark flex items-center justify-center p-4">
      <SEO 
        title="Forgot Password - WhatCyber ThreatFeed"
        description="Reset your password for your WhatCyber ThreatFeed account to access cybersecurity threat intelligence."
        keywords="forgot password, reset password, cybersecurity, threat intelligence, CVE, vulnerabilities"
      />
      <Card className="w-full max-w-md bg-whatcyber-dark border-whatcyber-light-gray">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            className="absolute left-4 top-4 text-slate-400 hover:text-slate-100"
            onClick={() => navigate('/login/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
          <div className="flex justify-center mb-4">
            <img 
              src={logoImage} 
              alt="WhatCyber Logo" 
              className="w-16 h-16 rounded-lg cursor-pointer"
              onClick={() => navigate('/')}
            />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-100">Forgot Password?</CardTitle>
          <CardDescription className="text-slate-400">
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10 bg-whatcyber-gray border-whatcyber-light-gray text-slate-100"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-whatcyber-teal hover:bg-whatcyber-teal/80 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm text-slate-400">
            Remember your password?{' '}
            <Button
              variant="link"
              className="text-whatcyber-teal hover:text-whatcyber-teal/80 p-0 h-auto"
              onClick={() => navigate('/login/')}
            >
              Sign in here
              </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
