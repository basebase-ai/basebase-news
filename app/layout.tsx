import type { Metadata } from 'next';
import { AppProvider } from '@/lib/state/AppContext';
import './globals.css';
import Toast from '@/components/Toast';

export const metadata: Metadata = {
  title: 'StoryList - Your news dashboard',
  description: 'Stay informed with StoryList - Your personalized news dashboard that brings the world\'s headlines to you at a glance.',
  icons: {
    icon: '/assets/images/logo_48x48.png',
    apple: '/assets/images/logo_48x48.png',
  },
};

// Client component wrapper
function ClientLayout({ children }: { children: React.ReactNode }) {
  'use client';
  
  return (
    <AppProvider>
      {children}
      <Toast />
    </AppProvider>
  );
}

// Root layout (server component)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;0,900;1,400;1,500;1,700;1,900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-white dark:bg-gray-950 font-roboto">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
} 