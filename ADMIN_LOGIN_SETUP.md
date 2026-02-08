# Admin Login System Setup Guide

This guide explains how to set up and use the new admin login system for your volunteer management application.

## Overview

The admin login system includes:
- **Login Page** (`/login`) - Clean, responsive login interface with show/hide password toggle
- **API Endpoint** (`/api/admin-login`) - Handles credential verification via Supabase
- **Local Storage** - Stores admin token and user info after successful login
- **Redirect** - Automatically redirects to dashboard after login

## Setup Steps

### 1. Create the `admin_users` Table in Supabase

Run this SQL in your Supabase SQL Editor to create the admin users table:

```sql
-- Create admin_users table
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_admin_users_username ON admin_users(username);

-- Insert a demo admin user (CHANGE PASSWORD IMMEDIATELY IN PRODUCTION)
-- Username: admin, Password: password123
INSERT INTO admin_users (username, password_hash, full_name, email, status)
VALUES ('admin', 'password123', 'Admin User', 'admin@example.com', 'Active');

-- Create a second demo user
INSERT INTO admin_users (username, password_hash, full_name, email, status)
VALUES ('superadmin', 'admin123', 'Super Admin', 'superadmin@example.com', 'Active');
```

### 2. Enable Row Level Security (RLS)

For security, enable RLS on the `admin_users` table:

```sql
-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to query the table (for login endpoint only)
CREATE POLICY "Allow anonymous select for login"
  ON admin_users
  FOR SELECT
  TO anon
  USING (true);

-- Only admins can update their own records
CREATE POLICY "Allow admins to update own record"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);
```

### 3. Test the Login

1. Visit `http://localhost:3000/login`
2. Try the demo credentials:
   - **Username:** `admin`
   - **Password:** `password123`

If login succeeds, you'll be redirected to the dashboard and the admin token will be stored in localStorage.

## File Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx                 # Login page component
│   └── api/
│       └── admin-login/
│           └── route.ts             # Login API endpoint
└── lib/
    └── admin-auth.ts                # (Optional) Helper functions
```

## Features Implemented

✅ **Responsive Design**
- Mobile-friendly layout
- Centered on all screen sizes
- Touch-friendly button sizes

✅ **Password Security**
- Show/Hide password toggle
- Input validation
- Error handling

✅ **User Experience**
- Loading spinner during login
- Success/Error messages
- Clear error messages
- Auto-redirect after login

✅ **Accessibility**
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus states

## Security Considerations

⚠️ **IMPORTANT: For Production**

1. **Hash Passwords**: Use `bcrypt` or similar to hash passwords before storing
   ```bash
   npm install bcryptjs
   ```

2. **Use Environment Variables**: Store sensitive data in `.env.local`
   ```
   ADMIN_SECRET_KEY=your_secret_key_here
   ```

3. **Implement JWT**: Use proper JWT tokens instead of base64
   ```bash
   npm install jsonwebtoken
   ```

4. **HTTPS Only**: Always use HTTPS in production

5. **Rate Limiting**: Implement rate limiting on the login endpoint to prevent brute force

6. **Session Management**: Implement proper session timeouts

## Updating the Schema

When you're ready for production, update the SQL to hash passwords:

```sql
-- Create function to hash passwords (requires pgcrypto extension)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update insert trigger to hash passwords automatically
CREATE OR REPLACE FUNCTION hash_admin_password()
RETURNS TRIGGER AS $$
BEGIN
  NEW.password_hash = crypt(NEW.password_hash, gen_salt('bf'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hash_admin_password_trigger
  BEFORE INSERT OR UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION hash_admin_password();
```

Then update the API to use bcrypt verification:

```typescript
// In src/app/api/admin-login/route.ts
import bcrypt from 'bcryptjs';

// Replace password comparison with:
const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
```

## API Response Format

### Successful Login
```json
{
  "success": true,
  "token": "eyJhZG1pbklkIjox...",
  "admin": {
    "id": 1,
    "username": "admin",
    "full_name": "Admin User"
  }
}
```

### Failed Login
```json
{
  "error": "Invalid username or password"
}
```

## Next Steps

1. **Add Protected Routes**: Create middleware to check for valid admin token
2. **Add Logout**: Add logout functionality to clear token from localStorage
3. **Add Session Timeout**: Implement auto-logout after inactivity
4. **Add Admin Management**: Create page to manage admin users
5. **Add Audit Log**: Log all admin login attempts
6. **Enable 2FA**: Implement two-factor authentication

## Troubleshooting

### "Invalid username or password" on correct credentials
- Check that the `admin_users` table exists
- Verify RLS policies allow anonymous SELECT access
- Check username/password are exact matches (case-sensitive)

### "An error occurred during login"
- Check browser console for detailed errors
- Verify Supabase URL and anon key are correct
- Check that your database connection is working

### Token not persisting
- Check browser localStorage (DevTools → Application → LocalStorage)
- Verify `localStorage.setItem()` is being called
- Check for privacy/incognito mode browser settings

## Example: Protecting Routes

To protect routes, create a middleware:

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('adminToken')?.value;

  if (!token && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|api).*)'],
};
```

## Need Help?

- Check the browser Console (F12) for JavaScript errors
- Check the Network tab to see API responses
- Review the SQL in Supabase to verify table structure
- Ensure environment variables are correctly set
