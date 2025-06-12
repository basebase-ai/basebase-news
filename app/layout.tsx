import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/state/AppContext';
import AuthWrapper from '@/components/AuthWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NewsWithFriends - Read the news with your friends who get it',
  description: 'Get out of your news bubble, see what your friends are reading, and discuss the latest news with them. Discover diverse perspectives and build connections through meaningful conversations.',
  keywords: ['news', 'friends', 'discussion', 'social news', 'news aggregation', 'current events'],
  authors: [{ name: 'NewsWithFriends' }],
  creator: 'NewsWithFriends',
  publisher: 'NewsWithFriends',
  icons: {
    icon: '/assets/images/logo_48x48.png',
    shortcut: '/assets/images/logo_48x48.png',
    apple: '/assets/images/logo_150x150.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://newswithfriends.com',
    siteName: 'NewsWithFriends',
    title: 'NewsWithFriends - Read the news with your friends who get it',
    description: 'Get out of your news bubble, see what your friends are reading, and discuss the latest news with them. Discover diverse perspectives and build connections through meaningful conversations.',
    images: [
      {
        url: '/assets/images/busy-coffee-shop.jpg',
        width: 1200,
        height: 630,
        alt: 'People reading and discussing news together',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@newswithfriends',
    creator: '@newswithfriends',
    title: 'NewsWithFriends - Read the news with your friends who get it',
    description: 'Get out of your news bubble, see what your friends are reading, and discuss the latest news with them.',
    images: ['/assets/images/busy-coffee-shop.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <AppProvider>
          <AuthWrapper>
            {children}
          </AuthWrapper>
        </AppProvider>
      </body>
    </html>
  );
} 