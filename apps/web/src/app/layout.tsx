import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/lib/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SocialActions - UK Council Spending Transparency",
  description:
    "Track and analyze UK council spending with AI-powered anomaly detection. Making public spending transparent and accountable.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <a href="/" className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">
                      SocialActions
                    </span>
                  </a>
                  <nav className="flex gap-6 text-sm">
                    <a
                      href="/councils"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Councils
                    </a>
                    <a
                      href="/anomalies"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Anomalies
                    </a>
                  </nav>
                </div>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t bg-white py-8 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
                <p>
                  Data sourced from council transparency pages under the Local
                  Government Transparency Code 2015.
                </p>
                <p className="mt-1">
                  Anomaly flags may have legitimate explanations. They are
                  flagged for public review.
                </p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
