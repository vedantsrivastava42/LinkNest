import { Geist } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Keep Bookmark",
  description: "A simple bookmark manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} font-sans antialiased bg-[#050505] text-zinc-100`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
