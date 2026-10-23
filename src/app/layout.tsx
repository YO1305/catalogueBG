import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Prata } from "next/font/google";
import { I18nProvider } from "@/components/i18n/I18n";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope" });
const prata = Prata({ subsets: ["latin", "cyrillic"], weight: "400", variable: "--font-prata" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: "BAHMAL HOME", template: "%s · BAHMAL HOME" },
  description: "Интерактивный каталог тканей BAHMAL HOME",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${prata.variable} ${mono.variable}`}>
        <I18nProvider lang="ru">{children}</I18nProvider>
      </body>
    </html>
  );
}
