import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JEE College Predictor | Vedantu",
  description: "Find your ideal college in 30 seconds. Upload your JEE Main scorecard and get personalized college predictions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
