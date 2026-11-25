import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FARINE - Commande en ligne',
  description: 'Système de commande en ligne pour la Boulangerie FARINE - Le Pré Saint-Gervais',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
