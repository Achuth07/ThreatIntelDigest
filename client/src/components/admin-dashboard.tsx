import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAuthenticatedUser, updateAuthToken, isAdmin } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/seo';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'wouter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft } from 'lucide-react';

interface User {
  id: number;
  name: string;
  displayName?: string | null;
  email: string;
  avatar: string | null;
  googleId?: string | null;
  emailVerified?: boolean;
  createdAt: string;
  lastLoginAt: string;
}

interface UserStats {
  totalUsers: number;
  recentLogins: number;
  newUserCount: number;
  activeUsersWeek: number;
  allUsers: User[];
  signupTrend: Array<{ date: string; count: number }>;
  token?: string;
}

// Add visitor count to the interface
interface AdminStats extends UserStats {
  visitorCount: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [resendingEmail, setResendingEmail] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Get user data from localStorage
        const userData = getAuthenticatedUser();
        if (!userData) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        // Check if user is admin
        if (!isAdmin(userData)) {
          setError('Access denied. Admin access required.');
          setLoading(false);
          return;
        }

        // Fetch user stats with authorization header
        const headers = {
          'Authorization': `Bearer ${userData.token}`
        };

        const userStatsResponse = await fetch('/api/user-management?stats=true', { headers });

        if (userStatsResponse.ok) {
          const userStats = await userStatsResponse.json();
          
          // Update token if provided in response
          if (userStats.token) {
            const updatedUser = { ...userData, token: userStats.token };
            updateAuthToken(updatedUser);
          }
          
          // Fetch visitor count
          try {
            const visitorCountResponse = await fetch('/api/visitor-count');
            let visitorCount = 0;
            
            if (visitorCountResponse.ok) {
              const visitorData = await visitorCountResponse.json();
              visitorCount = visitorData.count || 0;
            }
            
            // Combine user stats with visitor count
            setStats({
              ...userStats,
              visitorCount
            });
          } catch (visitorError) {
            console.error('Error fetching visitor count:', visitorError);
            // Set stats without visitor count if there's an error
            setStats({
              ...userStats,
              visitorCount: 0
            });
          }
        } else if (userStatsResponse.status === 401) {
          // Token expired, redirect to login
          localStorage.removeItem('cyberfeed_user');
          window.location.href = '/';
        } else {
          const errorData = await userStatsResponse.json();
          throw new Error(errorData.message || 'Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleResendVerification = async (userId: number, email: string) => {
    setResendingEmail(userId);
    try {
      const userData = getAuthenticatedUser();
      if (!userData) return;

      const response = await fetch('/api/user-management?action=resend-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast({
          title: '✅ Verification Email Sent',
          description: `Verification email has been resent to ${email}`,
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend verification email',
        variant: 'destructive',
      });
    } finally {
      setResendingEmail(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    
    try {
      const userData = getAuthenticatedUser();
      if (!userData) return;

      const response = await fetch(`/api/user-management?action=delete&userId=${deleteUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
        },
      });

      if (response.ok) {
        toast({
          title: '✅ User Deleted',
          description: 'User has been successfully deleted',
        });
        
        // Refresh the user list
        setStats(prevStats => {
          if (!prevStats) return null;
          return {
            ...prevStats,
            allUsers: prevStats.allUsers.filter(u => u.id !== deleteUserId),
            totalUsers: prevStats.totalUsers - 1,
          };
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete user');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setDeleteUserId(null);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-500">Error: {error}</div>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <SEO 
        title="Admin Dashboard - WhatCyber ThreatFeed"
        description="Admin dashboard for managing users, statistics, and system metrics for WhatCyber ThreatFeed."
        keywords="admin, dashboard, cybersecurity, threat intelligence, CVE, vulnerabilities, user management"
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Admin Dashboard</CardTitle>
            <Link href="/threatfeed/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to ThreatFeed
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatcyber-teal"></div>
              <span className="ml-2">Loading...</span>
            </div>
          ) : stats ? (
            <div>
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <div className="text-sm text-slate-400">Total Users</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.recentLogins}</div>
                    <div className="text-sm text-slate-400">Recent Logins (24h)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.newUserCount}</div>
                    <div className="text-sm text-slate-400">New Users (7d)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.activeUsersWeek}</div>
                    <div className="text-sm text-slate-400">Active Users (7d)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.visitorCount}</div>
                    <div className="text-sm text-slate-400">Total Visitors</div>
                  </CardContent>
                </Card>
              </div>

              {/* Signup Trend Graph */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">User Signups (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.signupTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#94a3b8"
                          tick={{ fill: '#94a3b8' }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          tick={{ fill: '#94a3b8' }}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0a0f1f', 
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#e2e8f0'
                          }}
                          labelFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString();
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: '#10b981', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Signups"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* All Users Table */}
              <h3 className="text-lg font-semibold mb-4">All Users ({stats.totalUsers})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Auth Method</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>First Login</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.allUsers && stats.allUsers.length > 0 ? (
                    stats.allUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {user.avatar ? (
                              <img 
                                src={user.avatar} 
                                alt={user.name} 
                                className="w-8 h-8 rounded-full mr-2"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-600 mr-2"></div>
                            )}
                            <span>{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.displayName ? (
                            <span className="text-whatcyber-teal">{user.displayName}</span>
                          ) : (
                            <span className="text-slate-500 italic">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.googleId ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                              </svg>
                              Google
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Email
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.googleId || user.emailVerified ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(user.lastLoginAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Show resend button only for unverified email users */}
                            {!user.googleId && !user.emailVerified && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResendVerification(user.id, user.email)}
                                disabled={resendingEmail === user.id}
                                className="text-xs"
                              >
                                {resendingEmail === user.id ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Resend
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteUserId(user.id)}
                              className="text-xs"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        No recent users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="bg-whatcyber-dark border-whatcyber-light-gray">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this user? This action cannot be undone. 
              All user data including bookmarks and preferences will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-slate-100 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}