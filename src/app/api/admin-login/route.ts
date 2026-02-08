import { NextRequest, NextResponse } from 'next/server';

// Demo credentials for testing (replace with Supabase auth later)
const DEMO_CREDENTIALS = {
  username: 'admin',
  password: 'password123',
  full_name: 'Admin User',
};

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

    // Demo authentication - trim inputs for comparison
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();
    
    console.log('[Login] Comparing:', { 
      inputUsername: trimmedUsername, 
      demoUsername: DEMO_CREDENTIALS.username,
      usernameMatch: trimmedUsername === DEMO_CREDENTIALS.username,
      passwordMatch: trimmedPassword === DEMO_CREDENTIALS.password
    });

    const isValid = trimmedUsername === DEMO_CREDENTIALS.username && trimmedPassword === DEMO_CREDENTIALS.password;

    if (isValid) {
      console.log('[Login] Authentication successful');
      
      // Generate token
      const token = Buffer.from(
        JSON.stringify({
          adminId: '1',
          username: DEMO_CREDENTIALS.username,
          timestamp: Date.now()
        })
      ).toString('base64');

      // Create response with token in JSON body and cookie
      const response = NextResponse.json(
        {
          success: true,
          token,
          admin: {
            id: '1',
            username: DEMO_CREDENTIALS.username,
            full_name: DEMO_CREDENTIALS.full_name
          }
        },
        { status: 200 }
      );

      // Set token as HTTP-only cookie for server-side middleware
      response.cookies.set('adminToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      console.log('[Login] Token cookie set successfully');
      return response;
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
