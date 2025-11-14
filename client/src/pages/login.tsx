import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { setAuthToken } from '@/lib/auth';
import logoImage from '@/assets/logo/android-chrome-512x512.png';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Check for verification or error messages in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    const error = params.get('error');

    if (verified === 'true') {
      toast({
        title: '✅ Email Verified!',
        description: 'Your email has been verified successfully. You can now sign in.',
        duration: 5000,
      });
      // Clean up URL
      window.history.replaceState({}, '', '/login');
    } else if (error) {
      let errorMessage = 'An error occurred during verification.';
      if (error === 'invalid_token') {
        errorMessage = 'Invalid or expired verification link. Please request a new one.';
      } else if (error === 'missing_token') {
        errorMessage = 'Verification link is missing required information.';
      } else if (error === 'verification_failed') {
        errorMessage = 'Email verification failed. Please try again or contact support.';
      }
      
      toast({
        title: 'Verification Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
      // Clean up URL
      window.history.replaceState({}, '', '/login');
    }
  }, [toast]);

  const handleGoogleLogin = () => {
    const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
    const authUrl = isProduction 
      ? 'https://threatfeed.whatcyber.com/api/auth?action=google'
      : '/api/auth?action=google';
    window.location.href = authUrl;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both email and password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store the auth token
      if (data.token) {
        setAuthToken(data.token);
        
        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });

        // Redirect to home page
        navigate('/');
        window.location.reload(); // Refresh to update auth state
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-whatcyber-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-whatcyber-dark border-whatcyber-light-gray">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            className="absolute left-4 top-4 text-slate-400 hover:text-slate-100"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex justify-center mb-4">
            <img 
              src={logoImage} 
              alt="WhatCyber Logo" 
              className="w-16 h-16 rounded-lg cursor-pointer"
              onClick={() => navigate('/')}
            />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-100">Sign in to WhatCyber</CardTitle>
          <CardDescription className="text-slate-400">
            Choose your preferred sign-in method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Sign In */}
          <Button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
            disabled={isLoading}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign in with Google</span>
            </div>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-whatcyber-light-gray" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-whatcyber-dark px-2 text-slate-400">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10 bg-whatcyber-gray border-whatcyber-light-gray text-slate-100"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 bg-whatcyber-gray border-whatcyber-light-gray text-slate-100"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-100"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="link"
                className="text-whatcyber-teal hover:text-whatcyber-teal/80 p-0 h-auto"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot Password?
              </Button>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-whatcyber-teal hover:bg-whatcyber-teal/80 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm text-slate-400">
            New to WhatCyber?{' '}
            <Button
              variant="link"
              className="text-whatcyber-teal hover:text-whatcyber-teal/80 p-0 h-auto"
              onClick={() => navigate('/register')}
            >
              Register here
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
