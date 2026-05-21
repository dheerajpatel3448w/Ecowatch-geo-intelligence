import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoWatch | Orbital Intel",
  description: "Next-Gen Environmental Monitoring & AI Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pt-24 pb-8 px-4 relative z-10">
            {children}
          </main>
          <Footer />
        </AuthProvider>
        <Toaster theme="dark" position="bottom-right" richColors />

      </body>
    </html>
  );
}
