import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Quiz de verdadeiro ou falso' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
