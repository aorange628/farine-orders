import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Protéger toutes les routes /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const basicAuth = request.headers.get('authorization');
    
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');
      
      // ⚠️ CHANGE CES IDENTIFIANTS !
      const validUser = 'admin';
      const validPassword = 'iNfotracK321';
      
      if (user === validUser && pwd === validPassword) {
        return NextResponse.next();
      }
    }
    
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Area"'
      }
    });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*'
};
