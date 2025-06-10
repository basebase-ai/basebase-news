import AppLayout from '@/components/AppLayout';

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
} 