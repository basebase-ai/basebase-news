import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/state/AppContext';
import { cookies } from 'next/headers';
import AppLayout from '@/components/AppLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NewsWithFriends',
  description: 'Discover and discuss news with friends',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('auth');
  const isAuthenticated = !!authCookie;
  
  console.log('RootLayout auth check:', {
    hasAuthCookie: !!authCookie,
    cookieValue: authCookie?.value ? 'present' : 'missing',
    isAuthenticated
  });

  return (
    <html lang="en">
      <head>
        <link href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <AppProvider>
          {isAuthenticated ? (
            <AppLayout>{children}</AppLayout>
          ) : (
            <main>
              {children}
            </main>
          )}
        </AppProvider>
      </body>
    </html>
  );
} 