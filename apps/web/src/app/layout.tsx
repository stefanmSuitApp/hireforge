import './global.css';

import { AppQueryProvider } from '../components/providers/app-query-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <AppQueryProvider>{children}</AppQueryProvider>
      </body>
    </html>
  );
}
