import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI Kubernetes Agent — Senior SRE Copilot',
  description: 'AI-powered autonomous Kubernetes troubleshooting and incident response platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
        body has NO bg class — globals.css sets the outer lavender gradient.
        The white rounded card wraps the actual product inside page.tsx.
      */}
      <body className="min-h-full font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
