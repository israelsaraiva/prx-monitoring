import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'MACC Monitoring Tool',
  description: 'GraphQL Subscription and Kafka Message Listener',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body style={{ fontFamily: 'Jost, system-ui, -apple-system, sans-serif' }}>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
