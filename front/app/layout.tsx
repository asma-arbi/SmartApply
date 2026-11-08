import type { Metadata } from 'next';
import '../src/index.css';

export const metadata: Metadata = {
  title: 'SmartApply Tunisia — Gestion des Entretiens',
  description:
    "Plateforme intelligente de recrutement IT en Tunisie : planification d'entretiens, détection de conflits, grilles d'évaluation et export calendrier.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
