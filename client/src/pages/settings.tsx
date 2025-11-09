import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  User, Shield, Settings as SettingsIcon, Key, CreditCard, Bell, 
  ChevronRight, Monitor, LogOut, Save, AlertCircle, Eye, EyeOff,
  RefreshCw, Trash2, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getAuthenticatedUser } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { Header } from '@/components/header';

interface UserSettings {
  displayName?: string;
  watchlistKeywords?: string;
  autoExtractIOCs?: boolean;
  autoEnrichIOCs?: boolean;
  hiddenIOCTypes?: string[];
  emailWeeklyDigest?: boolean;
  emailWatchlistAlerts?: boolean;
}

export default function Settings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const user = getAuthenticatedUser();
  
  const [settings, setSettings] = useState<UserSettings>({
    displayName: '',
    watchlistKeywords: '',
    autoExtractIOCs: true,
    autoEnrichIOCs: false,
    hiddenIOCTypes: [],
    emailWeeklyDigest: false,
    emailWatchlistAlerts: false,
  });
  
  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  
  // Available IOC types to hide
  const iocTypes = ['MD5', 'SHA1', 'SHA256', 'SHA512', 'IPv4', 'IPv6', 'Domain', 'URL', 'Email'];

  useEffect(() => {
    // Redirect to home if not authenticated
    if (!user) {
      navigate('/');
      return;
    }
    
    // Load user preferences from API
    loadUserPreferences();
    
    // Load API key from localStorage
    const savedApiKey = localStorage.getItem('user_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, [user, navigate]);

  const loadUserPreferences = async () => {
    try {
      const response = await apiRequest('GET', '/api/user-preferences');
      const prefs = await response.json();
      setSettings({
        displayName: prefs.displayName || '',
        watchlistKeywords: prefs.watchlistKeywords || '',
        autoExtractIOCs: prefs.autoExtractIOCs ?? true,
        autoEnrichIOCs: prefs.autoEnrichIOCs ?? false,
        hiddenIOCTypes: prefs.hiddenIOCTypes || [],
        emailWeeklyDigest: prefs.emailWeeklyDigest ?? false,
        emailWatchlistAlerts: prefs.emailWatchlistAlerts ?? false,
      });
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const validateDisplayName = (name: string): boolean => {
    if (!name || name.trim() === '') {
      setDisplayNameError('');
      return true;
    }
    
    if (name.length > 50) {
      setDisplayNameError('Display name must be 50 characters or less');
      return false;
    }
    
    if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
      setDisplayNameError('Display name must contain only letters, numbers, and spaces');
      return false;
    }
    
    setDisplayNameError('');
    return true;
  };

  const handleDisplayNameChange = (value: string) => {
    setSettings({ ...settings, displayName: value });
    validateDisplayName(value);
  };

  const handleSaveDisplayName = async () => {
    if (!validateDisplayName(settings.displayName || '')) {
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest('POST', '/api/user-preferences', {
        displayName: settings.displayName || null,
      });
      
      setIsEditingDisplayName(false);
      toast({
        title: "Display Name Saved",
        description: "Your display name has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save display name. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelDisplayName = () => {
    setIsEditingDisplayName(false);
    setDisplayNameError('');
    // Reload preferences to reset
    loadUserPreferences();
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await apiRequest('POST', '/api/user-preferences', {
        watchlistKeywords: settings.watchlistKeywords || null,
        autoExtractIOCs: settings.autoExtractIOCs,
        autoEnrichIOCs: settings.autoEnrichIOCs,
        hiddenIOCTypes: settings.hiddenIOCTypes,
        emailWeeklyDigest: settings.emailWeeklyDigest,
        emailWatchlistAlerts: settings.emailWatchlistAlerts,
      });
      
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateApiKey = () => {
    // Generate a random API key
    const newKey = `tk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(newKey);
    localStorage.setItem('user_api_key', newKey);
    
    toast({
      title: "API Key Generated",
      description: "Your new API key has been created. Keep it secure!",
    });
  };

  const handleRevokeApiKey = () => {
    setApiKey('');
    localStorage.removeItem('user_api_key');
    
    toast({
      title: "API Key Revoked",
      description: "Your API key has been deleted successfully.",
    });
  };

  const handleSignOutEverywhere = () => {
    toast({
      title: "Coming Soon",
      description: "Multi-session management will be available in a future update.",
    });
  };

  const handleIOCTypeToggle = (iocType: string) => {
    setSettings(prev => ({
      ...prev,
      hiddenIOCTypes: prev.hiddenIOCTypes?.includes(iocType)
        ? prev.hiddenIOCTypes.filter(t => t !== iocType)
        : [...(prev.hiddenIOCTypes || []), iocType]
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-whatcyber-dark">
      <Header 
        onSearch={() => {}}
        bookmarkCount={0}
        onBookmarksClick={() => {}}
        onSidebarToggle={() => {}}
        isSidebarOpen={false}
      />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Settings</h1>
          <p className="text-slate-400">Manage your account, preferences, and integrations</p>
        </div>

        <div className="space-y-6">
          {/* 1. Account & Profile */}
          <Card className="bg-whatcyber-gray border-whatcyber-light-gray">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-whatcyber-teal" />
                <CardTitle className="text-slate-100">Account & Profile</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Your identity and account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                {user.avatar && (
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-16 h-16 rounded-full border-2 border-whatcyber-light-gray"
                  />
                )}
                <div className="flex-1">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="name" className="text-slate-300">Display Name</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          id="name"
                          value={settings.displayName || ''}
                          onChange={(e) => handleDisplayNameChange(e.target.value)}
                          className="bg-whatcyber-dark border-whatcyber-light-gray text-slate-100 disabled:opacity-50"
                          placeholder={user.name || "Enter display name"}
                          disabled={!isEditingDisplayName}
                        />
                        {!isEditingDisplayName ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setIsEditingDisplayName(true)}
                            className="border-whatcyber-light-gray text-slate-300 hover:bg-whatcyber-dark"
                          >
                            Edit
                          </Button>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleSaveDisplayName}
                              disabled={isSaving || !!displayNameError}
                              className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleCancelDisplayName}
                              disabled={isSaving}
                              className="border-red-600 text-red-500 hover:bg-red-600 hover:text-white disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                      {displayNameError && (
                        <p className="text-xs text-red-400 mt-1">{displayNameError}</p>
                      )}
                      {!isEditingDisplayName && (
                        <p className="text-xs text-slate-500 mt-1">Click Edit to change your display name (letters, numbers, and spaces only, max 50 characters)</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-300">Email</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          value={user.email}
                          disabled
                          className="bg-whatcyber-dark/50 border-whatcyber-light-gray text-slate-400 cursor-not-allowed"
                        />
                        <span className="text-xs text-whatcyber-teal font-medium px-2 py-1 bg-whatcyber-teal/10 rounded">
                          Primary
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Used for Google Sign-In</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Security & Privacy */}
          <Card className="bg-whatcyber-gray border-whatcyber-light-gray">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-whatcyber-teal" />
                <CardTitle className="text-slate-100">Security & Privacy</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Manage your sessions and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Active Sessions</h4>
                <div className="bg-whatcyber-dark rounded-lg p-4 border border-whatcyber-light-gray">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Monitor className="w-5 h-5 text-whatcyber-teal" />
                      <div>
                        <p className="text-sm font-medium text-slate-300">Current Session</p>
                        <p className="text-xs text-slate-500">
                          {navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser'} on {
                            navigator.platform.includes('Mac') ? 'macOS' : 
                            navigator.platform.includes('Win') ? 'Windows' : 
                            navigator.platform.includes('Linux') ? 'Linux' : 'Device'
                          }
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-green-500 font-medium">Active</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Multi-session management coming in a future update
                </p>
              </div>
              
              <Separator className="bg-whatcyber-light-gray" />
              
              <div>
                <Button
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={handleSignOutEverywhere}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out Everywhere
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  This will invalidate all other sessions except the current one
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Application Preferences */}
          <Card className="bg-whatcyber-gray border-whatcyber-light-gray">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <SettingsIcon className="w-5 h-5 text-whatcyber-teal" />
                <CardTitle className="text-slate-100">Application Preferences</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Customize your threat intelligence experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Manage Feeds */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Manage Feeds</h4>
                <Button
                  variant="outline"
                  className="border-whatcyber-light-gray text-slate-300 hover:bg-whatcyber-dark"
                  onClick={() => navigate('/')}
                >
                  Go to Feed Management
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  Add, remove, and categorize your RSS feeds from the main page
                </p>
              </div>

              <Separator className="bg-whatcyber-light-gray" />

              {/* My Watchlist */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">My Watchlist</h4>
                <Label htmlFor="watchlist" className="text-xs text-slate-400">
                  Keywords to track (e.g., CVE-2025-1234, MyCompanyName, Volt Typhoon)
                </Label>
                <textarea
                  id="watchlist"
                  value={settings.watchlistKeywords}
                  onChange={(e) => setSettings({ ...settings, watchlistKeywords: e.target.value })}
                  className="w-full mt-2 p-3 bg-whatcyber-dark border border-whatcyber-light-gray rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-whatcyber-teal min-h-[100px]"
                  placeholder="Enter keywords, one per line or comma-separated"
                />
                <p className="text-xs text-slate-500 mt-2">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Articles matching these keywords will be highlighted in your feed (Coming soon)
                </p>
              </div>

              <Separator className="bg-whatcyber-light-gray" />

              {/* IOC Preferences */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">IOC Preferences</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-300">Auto-run Extraction</Label>
                      <p className="text-xs text-slate-500">
                        Automatically extract IOCs on article load
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoExtractIOCs}
                      onCheckedChange={(checked) => setSettings({ ...settings, autoExtractIOCs: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-300">Auto-enrich IOCs</Label>
                      <p className="text-xs text-slate-500">
                        Automatically fetch reputation from VirusTotal, AbuseIPDB, etc.
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoEnrichIOCs}
                      onCheckedChange={(checked) => setSettings({ ...settings, autoEnrichIOCs: checked })}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 mb-2 block">Hidden IOC Types</Label>
                    <p className="text-xs text-slate-500 mb-3">
                      Select IOC types you don't want to see
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {iocTypes.map((iocType) => (
                        <div key={iocType} className="flex items-center space-x-2">
                          <Checkbox
                            id={iocType}
                            checked={settings.hiddenIOCTypes?.includes(iocType)}
                            onCheckedChange={() => handleIOCTypeToggle(iocType)}
                          />
                          <label
                            htmlFor={iocType}
                            className="text-sm text-slate-300 cursor-pointer"
                          >
                            {iocType}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  IOC extraction feature coming in a future update
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 4. API & Integrations */}
          <Card className="bg-whatcyber-gray border-whatcyber-light-gray">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-whatcyber-teal" />
                <CardTitle className="text-slate-100">API & Integrations</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Connect external services and manage API access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* My API Key */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">My API Key</h4>
                {apiKey ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 relative">
                        <Input
                          value={apiKeyVisible ? apiKey : '•'.repeat(apiKey.length)}
                          readOnly
                          className="bg-whatcyber-dark border-whatcyber-light-gray text-slate-100 pr-10 font-mono text-sm"
                        />
                        <button
                          onClick={() => setApiKeyVisible(!apiKeyVisible)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                        >
                          {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-whatcyber-light-gray text-slate-300 hover:bg-whatcyber-dark"
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey);
                          toast({ title: "Copied!", description: "API key copied to clipboard" });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={handleRevokeApiKey}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Revoke API Key
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Button
                      variant="outline"
                      className="border-whatcyber-teal/50 text-whatcyber-teal hover:bg-whatcyber-teal/10"
                      onClick={handleGenerateApiKey}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Generate API Key
                    </Button>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Use this key to access your curated feed via our API
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  API endpoints coming in a future update
                </p>
              </div>

              <Separator className="bg-whatcyber-light-gray" />

              {/* Integration Settings */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Integration Settings</h4>
                <div className="bg-whatcyber-dark rounded-lg p-4 border border-whatcyber-light-gray border-dashed">
                  <p className="text-sm text-slate-400 text-center">
                    Third-party integrations (VirusTotal, Shodan, etc.) coming soon
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  You'll be able to enter your own API keys for enrichment services
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 5. Subscription & Billing */}
          <Card className="bg-whatcyber-gray border-whatcyber-light-gray">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-whatcyber-teal" />
                <CardTitle className="text-slate-100">Subscription & Billing</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Manage your subscription and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-whatcyber-teal/10 to-whatcyber-teal/5 rounded-lg p-6 border border-whatcyber-teal/30">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-100 mb-2">Current Plan: Free</h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-whatcyber-teal rounded-full mr-2"></span>
                        Unlimited RSS Feeds
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-whatcyber-teal rounded-full mr-2"></span>
                        Full CVE Database Access
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-whatcyber-teal rounded-full mr-2"></span>
                        Unlimited Bookmarks
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-whatcyber-teal rounded-full mr-2"></span>
                        Basic Support
                      </li>
                    </ul>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-whatcyber-teal">$0</p>
                    <p className="text-xs text-slate-400">forever</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Pro plan with advanced features coming soon
              </p>
            </CardContent>
          </Card>

          {/* 6. Notifications */}
          <Card className="bg-whatcyber-gray border-whatcyber-light-gray">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-whatcyber-teal" />
                <CardTitle className="text-slate-100">Notifications</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Configure how you receive updates and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-slate-300">Weekly Digest</Label>
                  <p className="text-xs text-slate-500">
                    Receive a weekly summary of top threats
                  </p>
                </div>
                <Switch
                  checked={settings.emailWeeklyDigest}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailWeeklyDigest: checked })}
                />
              </div>
              
              <Separator className="bg-whatcyber-light-gray" />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-slate-300">Watchlist Alerts</Label>
                  <p className="text-xs text-slate-500">
                    Email immediately when high-priority keywords are found
                  </p>
                </div>
                <Switch
                  checked={settings.emailWatchlistAlerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailWatchlistAlerts: checked })}
                />
              </div>

              <p className="text-xs text-slate-500 mt-3">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Email notifications will be available in a future update
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-3 pb-8">
            <Button
              variant="outline"
              className="border-whatcyber-light-gray text-slate-300 hover:bg-whatcyber-dark"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button
              className="bg-whatcyber-teal hover:bg-whatcyber-teal/90 text-whatcyber-dark"
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
