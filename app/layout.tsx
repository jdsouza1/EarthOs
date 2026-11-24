import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { Header } from '@/components/dashboard/Header';
import { SiteFooter } from '@/components/site/SiteFooter';
import { getDashboardData } from '@/lib/data';
import { cssVariables } from '@/lib/tokens';
import './globals.css';

const sans = Inter({ variable: '--font-inter', subsets: ['latin'] });
const heading = Space_Grotesk({ variable: '--font-space-grotesk', subsets: ['latin'], weight: ['500', '600', '700'] });
const mono = JetBrains_Mono({ variable: '--font-jetbrains-mono', subsets: ['latin'], weight: ['500', '700'] });

export const metadata: Metadata = {
  title: "EarthOS — Humanity's vital signs",
  description: 'A strategic dashboard tracking existential risk, systemic health, clean tech and access, and human flourishing.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The header badge reflects the whole dataset, so it is the same on every page.
  const { isIllustrative, source } = await getDashboardData();

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Design token values from lib/tokens.ts, read by the classes in globals.css. */}
        <style dangerouslySetInnerHTML={{ __html: cssVariables() }} />
        {/* Apply the saved light/dark choice before first paint, so the page never flashes the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.remove('dark')}catch(e){}" }} />
      </head>
      <body className={`${sans.variable} ${heading.variable} ${mono.variable} bg-canvas font-sans text-ink-2 antialiased selection:bg-accent-line`}>
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent-line focus:px-3 focus:py-2 focus:text-sm">
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <Header isIllustrative={isIllustrative} source={source} />
          <main id="content" className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
            {children}
          </main>
          <div className="mx-auto w-full max-w-[1180px] px-4 pb-6 md:px-6 print:hidden">
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
