"use client";

import { useExtracted } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import GoalFormModal from "./GoalFormModal";

interface CreateGoalButtonProps {
  siteId: number;
}

export default function CreateGoalButton({ siteId }: CreateGoalButtonProps) {
  const t = useExtracted();
  return (
    <>
      <GoalFormModal
        siteId={siteId}
        trigger={
          <Button className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            <span>{t("Add Goal")}</span>
          </Button>
        }
      />
    </>
  );
}
