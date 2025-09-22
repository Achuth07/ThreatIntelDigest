import { useState, useEffect } from 'react';
import { Search, Bookmark, Settings, Shield, Menu, X, LogOut, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface HeaderProps {
  onSearch: (query: string) => void;
  bookmarkCount: number;
  onBookmarksClick: () => void;
  onSidebarToggle: () => void;
  isSidebarOpen: boolean;
}

export function Header({ onSearch, bookmarkCount, onBookmarksClick, onSidebarToggle, isSidebarOpen }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      if (response.ok) {
        const data = await response.json();
        if (data.isAuthenticated) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // For production deployment, use the full URL to the Vercel API endpoint
    const isProduction = process.env.NODE_ENV === 'production';
    const authUrl = isProduction 
      ? 'https://threatfeed.whatcyber.com/api/auth/google'
      : '/api/auth/google';
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout');
      if (response.ok) {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (isSearchExpanded && searchQuery) {
      setSearchQuery('');
      onSearch('');
    }
  };

  return (
    <header className="bg-whatcyber-dark border-b border-whatcyber-light-gray/30 sticky top-0 z-50 backdrop-blur-sm bg-whatcyber-dark/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Button & Logo */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2 text-slate-400 hover:text-slate-100"
              onClick={onSidebarToggle}
              data-testid="button-mobile-menu"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-whatcyber-teal rounded-lg flex items-center justify-center logo-glow">
                <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-whatcyber-dark" data-testid="logo-icon" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg lg:text-xl font-bold text-slate-100 leading-tight" data-testid="logo-text">WhatCyber</h1>
                <span className="text-xs text-whatcyber-teal font-medium -mt-1" data-testid="logo-tagline">CyberFeed</span>
              </div>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <Input
                type="text"
                placeholder="Search threat intelligence articles..."
                className="w-full pl-10 pr-4 py-2 bg-whatcyber-gray border border-whatcyber-light-gray rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-whatcyber-teal focus:border-transparent"
                value={searchQuery}
                onChange={handleSearchChange}
                data-testid="input-search"
              />
            </div>
          </div>

          {/* Mobile Search Toggle & Actions */}
          <div className="flex items-center space-x-2">
            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2 text-slate-400 hover:text-slate-100"
              onClick={toggleSearch}
              data-testid="button-mobile-search"
            >
              <Search className="w-5 h-5" />
            </Button>
            {/* Bookmarks */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-slate-400 hover:text-slate-100 transition-colors relative"
              onClick={onBookmarksClick}
              data-testid="button-bookmarks"
              title="Bookmarks"
            >
              <Bookmark className="w-5 h-5" />
              {bookmarkCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 bg-whatcyber-teal text-xs rounded-full h-5 w-5 flex items-center justify-center text-whatcyber-dark font-medium"
                  data-testid="text-bookmark-count"
                >
                  {bookmarkCount}
                </span>
              )}
            </Button>
            
            {/* Settings - Hidden on mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:block p-2 text-slate-400 hover:text-slate-100 transition-colors"
              data-testid="button-settings"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
            
            {/* User Authentication */}
            <div className="flex items-center space-x-2 ml-4">
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-600 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-transparent animate-spin"></div>
                </div>
              ) : user ? (
                <div className="flex items-center space-x-2">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-8 h-8 rounded-full border-2 border-slate-600"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                  <span className="text-sm text-slate-300 hidden md:inline" data-testid="text-user-name">
                    {user.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-slate-400 hover:text-slate-100 flex items-center space-x-1"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden md:inline text-sm">Logout</span>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 text-slate-400 hover:text-slate-100"
                  onClick={handleGoogleLogin}
                  data-testid="button-google-login"
                  title="Sign in with Google"
                >
                  <div className="flex items-center space-x-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="hidden md:inline text-sm">Sign In</span>
                  </div>
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Search Bar */}
        {isSearchExpanded && (
          <div className="lg:hidden pb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <Input
                type="text"
                placeholder="Search threat intelligence articles..."
                className="w-full pl-10 pr-4 py-2 bg-whatcyber-gray border border-whatcyber-light-gray rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-whatcyber-teal focus:border-transparent"
                value={searchQuery}
                onChange={handleSearchChange}
                data-testid="input-search-mobile"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
