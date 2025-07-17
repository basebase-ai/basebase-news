import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/state/AppContext';
import AuthWrapper from '@/components/AuthWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NewsWithFriends - Social news discovery',
  description: 'Discover new articles from friends every day that you never would have found otherwise.',
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
    title: 'NewsWithFriends - Social news discovery',
    description: 'Discover new articles from friends every day that you never would have found otherwise.',
    images: [
      {
        url: '/assets/images/hero.avif',
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
    title: 'NewsWithFriends - Social news discovery',
    description: 'Discover new articles from friends every day that you never would have found otherwise.',
    images: ['/assets/images/hero.avif'],
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
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <AppProvider>
          <AuthWrapper>
            {children}
          </AuthWrapper>
          {/* Floating Action Button */}
          <a
            href="https://editor.basebase.us/?repo=https://github.com/grenager/basebase-news"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium text-sm"
          >
            <span>✨ Edit This</span>
          </a>
        </AppProvider>
      </body>
    </html>
  );
} 