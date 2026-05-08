import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  setRequestLocale,
  getMessages,
  getTranslations,
} from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { routing, rtlLocales } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tSite = await getTranslations({ locale, namespace: "Site" });
  const tHero = await getTranslations({ locale, namespace: "Hero" });

  const languages: Record<string, string> = {
    "x-default": "/en/",
  };
  for (const l of routing.locales) {
    languages[l] = `/${l}/`;
  }

  return {
    metadataBase: new URL("https://haslife.org"),
    title: {
      default: tSite("name"),
      template: `%s | ${tSite("name")}`,
    },
    description: tHero("subtitle"),
    alternates: {
      canonical: `/${locale}/`,
      languages,
    },
    openGraph: {
      title: tSite("name"),
      description: tHero("subtitle"),
      locale,
      alternateLocale: routing.locales.filter((l) => l !== locale),
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={rtlLocales.has(locale) ? "rtl" : "ltr"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
