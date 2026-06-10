import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import { ScrollToScreenTop } from "@/components/scroll-to-screen-top";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: {
    default: "StudentOS | AI Chief of Staff for Students",
    template: "%s | StudentOS"
  },
  description:
    "StudentOS turns scattered student commitments, deadlines, files, chats, and goals into a realistic plan you can follow.",
  applicationName: "StudentOS",
  keywords: [
    "StudentOS",
    "student planner",
    "AI study planner",
    "student productivity",
    "homework scheduler",
    "academic planning",
    "AI chief of staff"
  ],
  authors: [{ name: "StudentOS" }],
  creator: "StudentOS",
  publisher: "StudentOS",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.svg"
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "StudentOS | AI Chief of Staff for Students",
    description:
      "Turn school chaos into a plan you can actually follow. StudentOS reads commitments, catches conflicts, and schedules the next best step.",
    siteName: "StudentOS",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "StudentOS | AI Chief of Staff for Students",
    description:
      "StudentOS turns student chaos into a realistic, deadline-aware plan."
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${notoSans.variable} font-sans antialiased`}>
        <ScrollToScreenTop />
        {children}
      </body>
    </html>
  );
}
