import type { Metadata, Viewport } from "next";
import { Google_Sans_Flex, Pacifico } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const pacifico = Pacifico({
  weight: "400",
  variable: "--font-pacifico",
  subsets: ["latin"],
});

const googleSansFlex = Google_Sans_Flex({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-google-sans-flex",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#001a62",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Housie – Play Telugu Tambola Online",
    template: "%s | Housie Game",
  },
  description:
    "Play Telugu Tambola (Housie) online with friends and family. Create rooms, share codes, buy tickets and enjoy real-time multiplayer fun!",

  keywords: [
    "Housie",
    "Tambola",
    "Telugu Tambola",
    "Online Housie",
    "Multiplayer Tambola",
    "Indian Bingo",
    "Family game",
  ],

  authors: [{ name: "Charan vinay" }],
  creator: "Charan vinay",
  publisher: "Charan vinay",

  metadataBase: new URL("https://housiegame.vercel.app"),
  manifest: "/manifest.webmanifest",

  icons: {
    icon: [
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Housie",
  },

  openGraph: {
    title: "Housie – Play Telugu Tambola Online",
    description:
      "Create a room, invite your friends, have fun playing Telugu Tambola game!",
    url: "https://housiegame.vercel.app",
    siteName: "Housie",
    images: [
      {
        url: "https://housiegame.vercel.app/og-image-2.png",
        width: 1200,
        height: 630,
        alt: "Housie Telugu Tambola Game",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Housie – Play Telugu Tambola Online",
    description:
      "Create a room, invite your friends, have fun playing Telugu Tambola game!",
    images: ["/og-image-2.png"],
  },

  category: "game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={googleSansFlex.variable}>
      <body
        className={`${pacifico.variable} ${googleSansFlex.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
