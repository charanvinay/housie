import type { Metadata } from "next";
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

  openGraph: {
    title: "Housie – Play Telugu Tambola Online",
    description:
      "Create a room, invite your friends, have fun playing Telugu Tambola game!",
    url: "https://housiegame.vercel.app",
    siteName: "Housie",
    images: [
      {
        url: "https://housiegame.vercel.app/og-image.png",
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
    images: ["/og-image.png"],
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
