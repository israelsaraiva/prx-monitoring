import { PageTransition } from '@/components/PageTransition';
import { Toaster } from '@/components/ui/sonner';
import { KafkaConnectionProvider } from '@/contexts/kafka-connection-context';
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'Monitoring Tools',
  description: 'GraphQL Subscription and Kafka Message Listener',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <KafkaConnectionProvider>
            <PageTransition>{children}</PageTransition>
            <Toaster />
          </KafkaConnectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
