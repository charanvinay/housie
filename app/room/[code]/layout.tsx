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
  // #region agent log
  if (typeof fetch === "function") {
    fetch("http://127.0.0.1:7243/ingest/35f333f4-c284-4afe-b2ef-cae41b59ec59", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "5d8f75",
      },
      body: JSON.stringify({
        sessionId: "5d8f75",
        location: "app/room/[code]/layout.tsx:generateMetadata",
        message: "Room metadata generated",
        data: {
          code,
          pageUrl,
          openGraphTitle: metadata.openGraph?.title,
          openGraphUrl: metadata.openGraph?.url,
          openGraphImages: metadata.openGraph?.images,
        },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
  }
  // #endregion
  return metadata;
}

export default function RoomLayout({ children }: Props) {
  return <>{children}</>;
}
