# User Login Tracking

This document explains how to track new user logins in the ThreatIntelDigest application.

## 📊 How User Tracking Works

The application now tracks user logins in a PostgreSQL database table called `users`. Each time a user logs in with Google, their information is either:

1. **Created** - If it's their first login
2. **Updated** - If they've logged in before, their last login timestamp is updated

## 🗄️ Database Structure

The `users` table contains the following fields:

- `id` - Auto-incrementing primary key
- `google_id` - Unique Google user ID
- `name` - User's display name
- `email` - User's email address
- `avatar` - URL to user's profile picture
- `created_at` - Timestamp when the user first logged in
- `last_login_at` - Timestamp of the user's most recent login

## 📈 Viewing User Statistics

### 1. User Management API Endpoint

You can view user information using the consolidated API endpoint:

```
GET /api/user-management
```

To get user statistics, use the stats parameter:

```
GET /api/user-management?stats=true
```

This endpoint returns:

```json
{
  "totalUsers": 42,
  "recentLogins": 5,
  "newUserCount": 2,
  "recentUsers": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://lh3.googleusercontent.com/...",
      "createdAt": "2025-09-20T10:30:00.000Z",
      "lastLoginAt": "2025-09-21T14:45:00.000Z"
    }
    // ... more recent users
  ]
}
```

Key metrics provided:
- **totalUsers**: Total number of unique users who have logged in
- **recentLogins**: Number of users who logged in within the last 24 hours
- **newUserCount**: Number of users who first logged in within the last 7 days
- **recentUsers**: List of the 10 most recently logged in users

### 2. All Users API Endpoint

To see all users who have ever logged in:

```
GET /api/user-management
```

This endpoint returns an array of all users with their login information.

## 🖥️ Creating a Simple Admin Dashboard

You can create a simple admin dashboard page to view this information. Here's a basic example of how you might implement it:

```javascript
// Example React component to display user statistics
import { useState, useEffect } from 'react';

export function UserDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('stats'); // 'stats' or 'users'

  useEffect(() => {
    if (view === 'stats') {
      fetchUserStats();
    } else {
      fetchAllUsers();
    }
  }, [view]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user-management?stats=true');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/user-management');
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Login Dashboard</h1>
      
      <div className="mb-4">
        <button 
          onClick={() => { setView('stats'); setLoading(true); }}
          className={`mr-2 px-4 py-2 rounded ${view === 'stats' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Statistics
        </button>
        <button 
          onClick={() => { setView('users'); setLoading(true); }}
          className={`px-4 py-2 rounded ${view === 'users' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          All Users
        </button>
      </div>

      {view === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h2 className="text-lg font-semibold">Total Users</h2>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <h2 className="text-lg font-semibold">Recent Logins (24h)</h2>
            <p className="text-3xl font-bold">{stats.recentLogins}</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg">
            <h2 className="text-lg font-semibold">New Users (7d)</h2>
            <p className="text-3xl font-bold">{stats.newUserCount}</p>
          </div>
        </div>
      )}
      
      {view === 'stats' && stats && (
        <div>
          <h2 className="text-xl font-bold mb-4">Recent Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b text-left">User</th>
                  <th className="py-2 px-4 border-b text-left">Email</th>
                  <th className="py-2 px-4 border-b text-left">First Login</th>
                  <th className="py-2 px-4 border-b text-left">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">
                      <div className="flex items-center">
                        {user.avatar && (
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-8 h-8 rounded-full mr-2"
                          />
                        )}
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 border-b">{user.email}</td>
                    <td className="py-2 px-4 border-b">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-4 border-b">
                      {new Date(user.lastLoginAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'users' && (
        <div>
          <h2 className="text-xl font-bold mb-4">All Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b text-left">User</th>
                  <th className="py-2 px-4 border-b text-left">Email</th>
                  <th className="py-2 px-4 border-b text-left">First Login</th>
                  <th className="py-2 px-4 border-b text-left">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">
                      <div className="flex items-center">
                        {user.avatar && (
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-8 h-8 rounded-full mr-2"
                          />
                        )}
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 border-b">{user.email}</td>
                    <td className="py-2 px-4 border-b">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-4 border-b">
                      {new Date(user.lastLoginAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 🚀 Deployment Instructions

1. **Push Changes to GitHub**: Commit all the new files to your repository
2. **Redeploy to Vercel**: Trigger a new deployment in your Vercel dashboard
3. **Test User Tracking**: Log in with different Google accounts to see tracking in action
4. **View Statistics**: Access the `/api/user-management` endpoint to view user data

## 🔒 Security Note

The current implementation exposes user data through public API endpoints. In a production environment, you should:

1. Add authentication to these endpoints
2. Implement proper access controls (admin-only access)
3. Consider what user data should be exposed publicly
4. Add rate limiting to prevent abuse
5. Consider privacy implications of storing user data

## 📝 Future Enhancements

Consider implementing these features for better user tracking:

1. **Login History**: Track each individual login session with timestamps
2. **User Roles**: Add admin/user roles for access control
3. **Analytics Dashboard**: Create a more comprehensive dashboard with charts and graphs
4. **Export Functionality**: Allow exporting user data to CSV/JSON
5. **Search and Filter**: Add search and filtering capabilities to the user list
6. **User Activity Tracking**: Track what actions users perform in the application
7. **Email Notifications**: Send notifications when new users sign up
8. **User Management**: Allow admins to disable or delete user accounts

## 🧪 Testing User Tracking

To test that user tracking is working:

1. **First Login**: Log in with a new Google account
   - Check that a new record is created in the `users` table
   - Verify the `created_at` and `last_login_at` timestamps are set

2. **Repeat Login**: Log out and log back in with the same account
   - Check that the `last_login_at` timestamp is updated
   - Verify the `created_at` timestamp remains unchanged

3. **API Endpoints**: Test the API endpoints
   - Visit `/api/user-management?stats=true` to see statistics
   - Visit `/api/user-management` to see all users

4. **Database Verification**: Check the database directly
   - Connect to your PostgreSQL database
   - Run: `SELECT * FROM users;`
   - Verify user records are being created and updated

## 🆘 Troubleshooting

If user tracking isn't working:

1. **Check Database Connection**: Ensure `DATABASE_URL` is properly configured
2. **Verify Schema**: Make sure the `users` table exists in your database
3. **Check Logs**: Look at Vercel logs for any errors in the auth callback
4. **Test Locally**: Run the application locally to see detailed error messages

---

**User tracking is now implemented! 🚀**