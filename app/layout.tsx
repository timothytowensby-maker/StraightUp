import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StraightUp - Vibe Matching',
  description: 'Meet people who match your energy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-vibe-900 to-vibe-800 min-h-screen text-white">
        {children}
      </body>
    </html>
  );
}
