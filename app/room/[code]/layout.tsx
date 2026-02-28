import type { Metadata } from "next";

type Props = {
  params: Promise<{ code: string }>;
  children: React.ReactNode;
};

const OG_IMAGE_URL = "https://housiegame.vercel.app/og-image-2.png";
const SITE_URL = "https://housiegame.vercel.app";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const pageUrl = `${SITE_URL}/room/${code}`;
  const metadata: Metadata = {
    openGraph: {
      title: "Housie – Play Telugu Tambola Online",
      description:
        "Create a room, invite your friends, have fun playing Telugu Tambola game!",
      url: pageUrl,
      siteName: "Housie",
      type: "website",
      images: [
        {
          url: OG_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: "Housie Telugu Tambola Game",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Housie – Play Telugu Tambola Online",
      description:
        "Create a room, invite your friends, have fun playing Telugu Tambola game!",
      images: [OG_IMAGE_URL],
    },
  };
  return metadata;
}

export default function RoomLayout({ children }: Props) {
  return <>{children}</>;
}
