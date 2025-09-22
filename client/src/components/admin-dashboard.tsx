import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAuthenticatedUser, updateAuthToken, isAdmin } from '@/lib/auth';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  lastLoginAt: string;
}

interface UserStats {
  totalUsers: number;
  recentLogins: number;
  newUserCount: number;
  recentUsers: User[];
  token?: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'stats' | 'users'>('stats');

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

        // Fetch data with authorization header
        const headers = {
          'Authorization': `Bearer ${userData.token}`
        };

        let response;
        if (view === 'stats') {
          response = await fetch('/api/user-management?stats=true', { headers });
        } else {
          response = await fetch('/api/user-management', { headers });
        }

        if (response.ok) {
          const data = await response.json();
          
          // Update token if provided in response
          if (data.token) {
            const updatedUser = { ...userData, token: data.token };
            updateAuthToken(updatedUser);
          }
          
          if (view === 'stats') {
            setStats(data);
          } else {
            setUsers(data.users || data);
          }
        } else if (response.status === 401) {
          // Token expired, redirect to login
          localStorage.removeItem('cyberfeed_user');
          window.location.href = '/';
        } else {
          throw new Error('Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [view]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-500">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button 
              onClick={() => { setView('stats'); setLoading(true); }}
              className={`mr-2 ${view === 'stats' ? 'bg-whatcyber-teal text-whatcyber-dark' : 'bg-whatcyber-gray'}`}
            >
              Statistics
            </Button>
            <Button 
              onClick={() => { setView('users'); setLoading(true); }}
              className={view === 'users' ? 'bg-whatcyber-teal text-whatcyber-dark' : 'bg-whatcyber-gray'}
            >
              All Users
            </Button>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : view === 'stats' && stats ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              </div>

              <h3 className="text-lg font-semibold mb-4">Recent Users</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>First Login</TableHead>
                    <TableHead>Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentUsers.map((user) => (
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
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(user.lastLoginAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : view === 'users' && users ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>First Login</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
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
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(user.lastLoginAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}