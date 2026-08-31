import type { Metadata } from 'next';
import { Inter, Prompt } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const promptFont = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-prompt',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI-NOC | AI Network Operation Center',
  description: 'ระบบวิเคราะห์ปัญหาเครือข่ายเสมือนบนแพลตฟอร์ม Virtualization ด้วยปัญญาประดิษฐ์และข้อมูลเชิงสังเกตหลายแหล่ง',
};

// Runs before paint so a returning visitor's saved theme applies immediately
// (no flash of the default dark theme before switching to light).
const THEME_INIT_SCRIPT = `
  try {
    if (localStorage.getItem('theme') === 'light') {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${inter.variable} ${promptFont.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-slate-50 dark:bg-[#0A0F1C] text-slate-900 dark:text-[#E8EDF7] antialiased selection:bg-blue-600 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
