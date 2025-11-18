"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatter } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface OverviewCardData {
  title: string;
  value: number;
  icon: LucideIcon;
  description?: string;
}

interface OverviewCardsProps {
  cards: OverviewCardData[];
  isLoading: boolean;
}

export function OverviewCards({ cards, isLoading }: OverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-lg p-6 hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{card.title}</div>
              <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            )}
            {card.description && <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">{card.description}</div>}
          </div>
        );
      })}
    </div>
  );
}
