import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Demo credentials for testing (replace with Supabase auth later)
const DEMO_CREDENTIALS = {
  username: 'admin',
  password: 'password123',
  full_name: 'Admin User',
};

interface AuthenticatedAdmin {
  id: string;
  username: string;
  full_name: string;
}

function createAuthResponse(admin: AuthenticatedAdmin) {
  const token = Buffer.from(
    JSON.stringify({
      adminId: admin.id,
      username: admin.username,
      timestamp: Date.now()
    })
  ).toString('base64');

  const response = NextResponse.json(
    {
      success: true,
      token,
      admin
    },
    { status: 200 }
  );

  response.cookies.set('adminToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    console.log('[Login] Received credentials:', { username: username?.trim(), password: password?.length > 0 ? '****' : 'empty' });

    // Validate input
    if (!username || !password) {
      console.log('[Login] Missing username or password');
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const envUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD?.trim();
    const envFullName = process.env.ADMIN_FULL_NAME?.trim() || 'Admin User';

    if (envUsername && envPassword) {
      const envMatch =
        trimmedUsername === envUsername && trimmedPassword === envPassword;

      if (envMatch) {
        console.log('[Login] Authentication successful via environment credentials');
        return createAuthResponse({
          id: 'env-admin',
          username: envUsername,
          full_name: envFullName
        });
      }
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: adminRecord, error: adminError } = await supabaseServiceRole
        .from('admin_users')
        .select('id, username, password_hash, full_name, status')
        .eq('username', trimmedUsername)
        .maybeSingle();

      if (adminError) {
        console.error('[Login] admin_users lookup error:', adminError.message);
      }

      if (
        adminRecord &&
        adminRecord.status !== 'Inactive' &&
        adminRecord.password_hash === trimmedPassword
      ) {
        console.log('[Login] Authentication successful via admin_users table');
        return createAuthResponse({
          id: String(adminRecord.id),
          username: String(adminRecord.username),
          full_name: String(adminRecord.full_name || 'Admin User')
        });
      }
    }

    const demoMatch =
      trimmedUsername === DEMO_CREDENTIALS.username &&
      trimmedPassword === DEMO_CREDENTIALS.password;

    if (demoMatch) {
      console.log('[Login] Authentication successful via demo credentials');
      return createAuthResponse({
        id: '1',
        username: DEMO_CREDENTIALS.username,
        full_name: DEMO_CREDENTIALS.full_name
      });
    }

    // Invalid credentials
    console.log('[Login] Authentication failed - invalid credentials');
    return NextResponse.json(
      { error: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
