import AppLayout from '@/components/AppLayout';

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
} 