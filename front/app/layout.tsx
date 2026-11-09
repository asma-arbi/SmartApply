import type { Metadata } from 'next';
import '../src/index.css';
import FrontSidebar from '../src/components/FrontSidebar';

export const metadata: Metadata = {
  title: 'SmartApply Tunisia — Gestion des Entretiens',
  description:
    "Plateforme intelligente de recrutement IT en Tunisie : planification d'entretiens, détection de conflits, grilles d'évaluation et export calendrier.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <FrontSidebar />
        <div style={{ marginLeft: 256 }}>{children}</div>
      </body>
    </html>
  );
}