# Complete Admin Login & Route Protection System

This guide explains the complete authentication flow implementation that protects your entire app with a login requirement.

## Overview

The system implements:
- **Auth Context** - Global authentication state management
- **Middleware** - Server-side route protection
- **Protected Routes** - Client-side redirects based on login status
- **Loading Screen** - Shows while authentication is being verified
- **Logout Functionality** - Clear session and redirect to login

## Architecture

```
User visits app
    ↓
Middleware checks for token
    ↓
AuthContext checks localStorage
    ↓
Loading screen shown while checking
    ↓
If authenticated → Dashboard
If not authenticated → Redirect to /login
```

## Files Created/Modified

### New Files

1. **`src/context/AuthContext.tsx`**
   - Global authentication context and provider
   - `useAuth()` hook for accessing auth state
   - Handles login, logout, and session persistence

2. **`src/middleware.ts`**
   - Server-side route protection
   - Redirects unauthenticated users to login
   - Prevents authenticated users from accessing login page

3. **`src/components/AuthLoadingScreen.tsx`**
   - Loading screen shown during auth verification
   - Custom spinner and loading message

### Modified Files

1. **`src/app/layout.tsx`**
   - Wrapped with `<AuthProvider>`
   - Added `<AuthLoadingScreen>` wrapper

2. **`src/app/login/page.tsx`**
   - Updated to use `useAuth()` hook
   - Integrated with global auth state

3. **`src/components/Navbar.tsx`**
   - Added admin user info display
   - Added logout button with styling

## How It Works

### 1. Initial Load

```typescript
// AuthContext.tsx - On mount
useEffect(() => {
  // Checks localStorage for existing token
  const token = localStorage.getItem('adminToken');
  const user = localStorage.getItem('adminUser');
  
  // If token exists, restore session
  if (token && user) {
    setAdmin(JSON.parse(user));
    setIsAuthenticated(true);
  }
  
  setIsLoading(false);
}, []);
```

### 2. Route Protection

```typescript
// AuthContext.tsx - Automatic redirects
useEffect(() => {
  if (isLoading) return;

  // Already logged in → trying /login → Redirect to /
  if (pathname === '/login' && isAuthenticated) {
    router.push('/');
  }

  // Not logged in → trying protected route → Redirect to /login
  if (pathname !== '/login' && !isAuthenticated) {
    router.push('/login');
  }
}, [isAuthenticated, isLoading, pathname]);
```

### 3. Login Flow

```typescript
// User submits login form
const login = async (username: string, password: string) => {
  // 1. Call API with credentials
  const response = await fetch('/api/admin-login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  // 2. Get token and user data
  const data = await response.json();

  // 3. Save to localStorage
  localStorage.setItem('adminToken', data.token);
  localStorage.setItem('adminUser', JSON.stringify(data.admin));

  // 4. Update context state
  setAdmin(data.admin);
  setIsAuthenticated(true);

  // 5. Redirect happens automatically via useEffect
};
```

### 4. Logout Flow

```typescript
const logout = () => {
  // 1. Clear storage
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');

  // 2. Update state
  setAdmin(null);
  setIsAuthenticated(false);

  // 3. Redirect to login (happens automatically via useEffect)
  router.push('/login');
};
```

## Protected Routes

The following routes are automatically protected:
- `/` (dashboard)
- `/tasks` 
- `/volunteers`

The login page (`/login`) is the only public route.

## Step-by-Step Usage

### For End Users

1. **Visit the app** → Automatically redirected to login page
2. **Enter credentials** → Username and password validation
3. **Click Login** → API validates against admin_users table
4. **Success** → Redirected to dashboard
5. **Use app** → All features available
6. **Logout** → Click logout button in navbar

### For Developers

#### To add a new protected route:

```typescript
// src/middleware.ts
const PROTECTED_ROUTES = [
  '/',
  '/tasks',
  '/volunteers',
  '/new-route'  // Add here
];
```

#### To customize auth check:

```typescript
// src/context/AuthContext.tsx
const checkAuth = () => {
  // Add custom logic here
  // Example: Validate token expiration
  // Example: Make API call to verify token
};
```

#### To add role-based access:

```typescript
// src/context/AuthContext.tsx
interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'superadmin';  // Add this
}

// In components:
const { admin } = useAuth();
if (admin?.role === 'superadmin') {
  // Show admin panel
}
```

## Database Requirements

Make sure your `admin_users` table exists:

```sql
-- Create admin_users table if not already exists
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sample data
INSERT INTO admin_users (username, password_hash, full_name)
VALUES ('admin', 'password123', 'Admin User');
```

## Security Features

### ✅ Implemented

1. **Token Storage** - Stored in localStorage for persistence
2. **API Validation** - Credentials verified on server
3. **Route Protection** - Both client and server-side
4. **Session Persistence** - Survives page refresh
5. **Loading State** - No UI flashing during auth check
6. **Logout** - Complete session cleanup

### ⚠️ For Production

1. **HTTPS Only** - Use secure cookies instead of localStorage
   ```typescript
   // Set httpOnly cookie instead
   response.cookies.set('adminToken', token, {
     httpOnly: true,
     secure: true,
     sameSite: 'strict',
     maxAge: 86400
   });
   ```

2. **Token Expiration**
   ```typescript
   // Add token expiration check
   const isTokenExpired = (token: string) => {
     const decoded = JSON.parse(atob(token.split('.')[1]));
     return decoded.timestamp < Date.now() - 24 * 60 * 60 * 1000;
   };
   ```

3. **Password Hashing** - Use bcrypt (see ADMIN_LOGIN_SETUP.md)

4. **CSRF Protection** - Enable CSRF tokens on forms

5. **Rate Limiting** - Prevent brute force attacks

## Troubleshooting

### Issue: Infinite redirect loop

**Solution:** Check that AuthProvider wraps the entire app in layout.tsx

```tsx
// ✅ Correct
<AuthProvider>
  <AuthLoadingScreen>
    {/* app content */}
  </AuthLoadingScreen>
</AuthProvider>

// ❌ Wrong
<AuthLoadingScreen>
  <AuthProvider>
    {/* app content */}
  </AuthProvider>
</AuthLoadingScreen>
```

### Issue: Token not persisting after refresh

**Solution:** Verify localStorage is enabled in browser and check DevTools

```bash
# In browser console
localStorage.getItem('adminToken')
localStorage.getItem('adminUser')
```

### Issue: "useAuth must be used within AuthProvider"

**Solution:** Ensure component is client-side and inside AuthProvider

```tsx
// ✅ Correct
'use client';
import { useAuth } from '@/context/AuthContext';

export default function MyComponent() {
  const { isAuthenticated } = useAuth();
  // ...
}

// ❌ Wrong - using in server component
// Remove 'use client' if this is a server component
```

### Issue: Navbar doesn't show logout button

**Solution:** Check that Navbar has `'use client'` directive and useAuth hook

```tsx
'use client';  // This is required!
import { useAuth } from '@/context/AuthContext';
```

## Testing the System

### Test 1: Login Redirect
1. Clear localStorage: `localStorage.clear()`
2. Visit `http://localhost:3000/`
3. Should redirect to `/login`

### Test 2: Successful Login
1. Enter admin credentials
2. Should redirect to `/`
3. Check localStorage for token
4. Page refresh should keep you logged in

### Test 3: Logout
1. Click logout button
2. Should redirect to `/login`
3. localStorage should be cleared
4. Trying to access `/` should redirect to `/login`

### Test 4: Protected Routes
1. Clear localStorage
2. Try to visit `/tasks` or `/volunteers`
3. Should redirect to `/login`

## Environment Variables

Make sure your `.env.local` has these variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Next Features to Add

- [ ] Token expiration and refresh
- [ ] Remember me functionality
- [ ] Multi-factor authentication
- [ ] Role-based access control (RBAC)
- [ ] Admin audit logs
- [ ] Session timeout
- [ ] Device/IP restrictions

## Support

If you encounter issues:
1. Check browser console (F12)
2. Check Network tab for API calls
3. Verify admin_users table exists
4. Test credentials directly in Supabase
5. Check that all env variables are set
