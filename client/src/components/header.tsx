import { useState } from 'react';
import { Search, Bookmark, Settings, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onSearch: (query: string) => void;
  bookmarkCount: number;
  onBookmarksClick: () => void;
}

export function Header({ onSearch, bookmarkCount, onBookmarksClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-cyber-cyan" data-testid="logo-icon" />
              <h1 className="text-xl font-bold text-slate-100" data-testid="logo-text">CyberFeed</h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8">
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
                data-testid="input-search"
              />
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
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
            
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-slate-400 hover:text-slate-100 transition-colors"
              data-testid="button-settings"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center space-x-2 ml-4">
              <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-sm text-slate-300" data-testid="text-user-name">Security Analyst</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
