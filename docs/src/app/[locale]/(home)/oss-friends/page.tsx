import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "OSS Friends | Rybbit",
  description: "Open source projects we love and support. Join our OSS Friends community.",
  openGraph: {
    images: [createOGImageUrl("OSS Friends", "Open source projects we love and support. Join our OSS Friends community.")],
  },
  twitter: {
    images: [createOGImageUrl("OSS Friends", "Open source projects we love and support. Join our OSS Friends community.")],
  },
});

interface OSSFriend {
  href: string;
  name: string;
  description: string;
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return "";
  }
}

async function getOSSFriends(): Promise<OSSFriend[]> {
  try {
    const response = await fetch("https://formbricks.com/api/oss-friends", {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      console.error("Failed to fetch OSS friends");
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching OSS friends:", error);
    return [];
  }
}

export default async function OSSFriendsPage() {
  const friends = await getOSSFriends();
  const needsFiller = friends.length % 2 === 1;

  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        title="OSS Friends"
        description="We're proud to be part of the open source community. Here are some amazing open source projects we love and support."
        eventLocation="oss_friends_hero"
        primaryAction={null}
        secondaryAction={null}
        note={null}
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label="Open source friends">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />

          {friends.length === 0 ? (
            <p className="px-5 py-16 text-neutral-600 dark:text-neutral-400 sm:px-8 lg:px-10">
              No OSS friends found. Check back later.
            </p>
          ) : (
            <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 sm:grid-cols-2">
              {friends.map(friend => (
                <Link
                  key={friend.href}
                  href={friend.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-4 bg-white px-5 py-7 transition-colors duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:bg-neutral-950 dark:hover:bg-neutral-900/60 sm:px-8"
                >
                  <Image
                    src={getFaviconUrl(friend.href)}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-md"
                    unoptimized
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1.5 font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                      {friend.name}
                      <ArrowUpRight
                        className="size-4 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none dark:text-neutral-600"
                        aria-hidden="true"
                      />
                    </h3>
                    <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                      {friend.description}
                    </p>
                  </div>
                </Link>
              ))}
              {needsFiller && <div aria-hidden="true" className="hidden bg-white dark:bg-neutral-950 sm:block" />}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
