import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SWRegister } from "@/components/layout/SWRegister";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "Wadi Al Buraq CRM",
    template: "%s · Wadi Al Buraq CRM",
  },
  description: "Client & Sales Management Dashboard — WADI AL BURAQ TOURISM L.L.C.",
  manifest: "/manifest.json",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14477d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-sans`} style={{ fontFamily: "var(--font-jakarta), ui-sans-serif, system-ui" }}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" closeButton />
            <SWRegister />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
