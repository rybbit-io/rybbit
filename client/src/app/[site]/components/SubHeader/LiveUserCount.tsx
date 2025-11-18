import { useGetLiveUsercount } from "../../../../api/analytics/useGetLiveUserCount";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import NumberFlow from "@number-flow/react";

export function LiveUserCount() {
  const { data } = useGetLiveUsercount(5);

  return (
    <div className="flex items-center gap-1 text-base text-neutral-700 dark:text-neutral-200 mr-1">
      <div className="flex justify-center">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger>
          <span className="text-sm text-neutral-700 dark:text-neutral-200 ml-1 font-medium">
            {<NumberFlow respectMotionPreference={false} value={data?.count ?? 0} />}
            <span className="ml-1"></span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Users online in past 5 minutes</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
