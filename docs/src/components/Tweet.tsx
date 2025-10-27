/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { enrichTweet, type TweetProps } from "react-tweet";
import { getTweet, type Tweet } from "react-tweet/api";
import { TweetBody, TweetHeader, TweetMedia } from "./TweetClient";

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("rounded-md bg-primary/10", className)} {...props} />;
};

export const TweetSkeleton = ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
  <div className={cn("flex size-full max-h-max min-w-72 flex-col gap-2 rounded-lg border p-4", className)} {...props}>
    <div className="flex flex-row gap-2">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);

export const TweetNotFound = ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
  <div
    className={cn("flex size-full flex-col items-center justify-center gap-2 rounded-lg border p-4", className)}
    {...props}
  >
    <h3>Tweet not found</h3>
  </div>
);

export const MagicTweet = ({ tweet, className, ...props }: { tweet: Tweet; className?: string }) => {
  const enrichedTweet = enrichTweet(tweet);
  return (
    <div
      className={cn(
        "relative flex size-full max-w-lg flex-col gap-2 overflow-hidden rounded-lg p-4 backdrop-blur-md bg-neutral-800/20 border border-neutral-800/50",
        className
      )}
      {...props}
    >
      <TweetHeader tweet={enrichedTweet} />
      <TweetBody tweet={enrichedTweet} />
      {tweet.id_str !== "1920425974954381456" && (
        <div className="hidden sm:block">
          <TweetMedia tweet={enrichedTweet} />
        </div>
      )}
    </div>
  );
};

/**
 * TweetCard (Server Side Only)
 */
export const TweetCard = async ({
  id,
  components,
  fallback = <TweetSkeleton />,
  onError,
  ...props
}: TweetProps & {
  className?: string;
}) => {
  const tweet = id
    ? await getTweet(id).catch(err => {
        if (onError) {
          onError(err);
        } else {
          console.error(err);
        }
      })
    : undefined;

  if (!tweet) {
    const NotFound = components?.TweetNotFound || TweetNotFound;
    return <NotFound {...props} />;
  }

  return (
    <Suspense fallback={fallback}>
      <MagicTweet tweet={tweet} {...props} />
    </Suspense>
  );
};
