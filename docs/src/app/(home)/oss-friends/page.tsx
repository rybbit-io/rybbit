import Link from "next/link";
import Image from "next/image";

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="max-w-[1300px] mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">OSS Friends</h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            We're proud to be part of the open source community. Here are some amazing open source projects we love and
            support.
          </p>
        </div>

        {/* OSS Friends Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {friends.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-neutral-600 dark:text-neutral-400">No OSS friends found. Check back later!</p>
            </div>
          ) : (
            friends.map(friend => (
              <Link
                key={friend.href}
                href={friend.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 p-6 transition-all hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-white dark:hover:bg-neutral-900"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Image
                      src={getFaviconUrl(friend.href)}
                      alt={`${friend.name} favicon`}
                      width={32}
                      height={32}
                      className="rounded"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {friend.name}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">{friend.description}</p>
                  </div>
                </div>
                <div className="absolute top-4 right-4 text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-400 transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: "OSS Friends | Rybbit",
  description: "Open source projects we love and support. Join our OSS Friends community.",
};
