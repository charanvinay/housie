import type { Metadata } from "next";

type Props = {
  params: Promise<{ code: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;
  return {
    openGraph: {
      images: [
        {
          url: "https://housiegame.vercel.app/og-image.png",
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default function RoomLayout({ children }: Props) {
  return <>{children}</>;
}
