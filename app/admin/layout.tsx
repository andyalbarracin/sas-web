import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/600.css';
import './admin.css';
import type { Metadata } from 'next';
import { SEED } from '@/lib/content/seed';
import { UI } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Panel · SAS', robots: { index: false, follow: false }, icons: { icon: '/brand/sas-mark.svg' } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="adm-body">
        {children}
        <footer className="a-foot">
          <span>
            © {new Date().getFullYear()} {SEED.footer.legal.es}
          </span>
          <a href="https://zairetech.com" target="_blank" rel="noopener">
            {UI.es.footer.credit}
          </a>
        </footer>
      </body>
    </html>
  );
}
