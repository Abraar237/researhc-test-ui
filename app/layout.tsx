import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./bootcamps.css";
import "./hero-centered.css";
import "./theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vizuara Research — From curiosity to contribution",
  description: "Explore Vizuara’s research bootcamps and the questions we investigate. An interactive atlas of AI, machine learning, and student research.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint so there is no flash of the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('vizuara-theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
