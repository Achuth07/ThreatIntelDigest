import { useState } from 'react';
import { Search, Bookmark, Settings, Shield, Menu, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
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
              <Shield className="w-6 lg:w-8 h-6 lg:h-8 text-cyber-cyan" data-testid="logo-icon" />
              <div className="flex flex-col">
                <h1 className="text-lg lg:text-xl font-bold text-slate-100 leading-tight" data-testid="logo-text">WhatCyber</h1>
                <span className="text-xs text-slate-400 font-medium -mt-1" data-testid="logo-tagline">CyberFeed</span>
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
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyber-cyan focus:border-transparent"
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
                  className="absolute -top-1 -right-1 bg-cyber-cyan text-xs rounded-full h-5 w-5 flex items-center justify-center text-dark-slate font-medium"
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
            
            {/* User Profile - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-2 ml-4">
              <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-sm text-slate-300" data-testid="text-user-name">Security Analyst</span>
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
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyber-cyan focus:border-transparent"
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
