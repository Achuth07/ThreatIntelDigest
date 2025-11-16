import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@/assets/logo/android-chrome-512x512.png';
import { SEO } from '@/components/seo';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // Get token from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token');
    if (!resetToken) {
      toast({
        title: 'Invalid Link',
        description: 'This password reset link is invalid or has expired',
        variant: 'destructive',
      });
      navigate('/forgot-password/');
    } else {
      setToken(resetToken);
    }
  }, [navigate, toast]);

  // Password strength calculation
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 15;
    return Math.min(strength, 100);
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  const getStrengthColor = (strength: number) => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Medium';
    return 'Strong';
  };

  const validateForm = (): string | null => {
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password)) {
      return 'Password must contain both uppercase and lowercase letters';
    }

    if (!/(?=.*\d)/.test(formData.password)) {
      return 'Password must contain at least one number';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/email/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setResetSuccess(true);
      toast({
        title: 'Password Reset Successful',
        description: 'You can now sign in with your new password',
      });
    } catch (error) {
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-whatcyber-dark flex items-center justify-center p-4">
        <SEO 
          title="Password Reset Successful - WhatCyber ThreatFeed"
          description="Your password has been successfully reset. You can now sign in with your new password."
          keywords="password reset, success, cybersecurity, threat intelligence, CVE, vulnerabilities"
        />
        <Card className="w-full max-w-md bg-whatcyber-dark border-whatcyber-light-gray">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-100">Password Reset Complete</CardTitle>
            <CardDescription className="text-slate-400">
              Your password has been successfully reset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300 text-sm text-center">
              You can now sign in with your new password
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-whatcyber-teal hover:bg-whatcyber-teal/80"
              onClick={() => navigate('/login/')}
            >
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-whatcyber-dark flex items-center justify-center p-4">
      <SEO 
        title="Reset Password - WhatCyber ThreatFeed"
        description="Reset your password for your WhatCyber ThreatFeed account to access cybersecurity threat intelligence."
        keywords="reset password, cybersecurity, threat intelligence, CVE, vulnerabilities"
      />
      <Card className="w-full max-w-md bg-whatcyber-dark border-whatcyber-light-gray">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logoImage} 
              alt="WhatCyber Logo" 
              className="w-16 h-16 rounded-lg cursor-pointer"
              onClick={() => navigate('/')}
            />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-100">Reset Your Password</CardTitle>
          <CardDescription className="text-slate-400">
            Create a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
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
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={passwordStrength} 
                      className={`h-2 ${getStrengthColor(passwordStrength)}`}
                    />
                    <span className="text-xs text-slate-400">{getStrengthText(passwordStrength)}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Use 8+ characters with uppercase, lowercase, numbers, and symbols
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  className="pl-10 pr-10 bg-whatcyber-gray border-whatcyber-light-gray text-slate-100"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-100"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-whatcyber-teal hover:bg-whatcyber-teal/80 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm text-slate-400">
            Remember your password?{' '}
            <Button
              variant="link"
              className="text-whatcyber-teal hover:text-whatcyber-teal/80 p-0 h-auto"
              onClick={() => navigate('/login')}
            >
              Sign in here
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
