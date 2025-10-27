"use client";
import { Filter, FilterParameter } from "@rybbit/shared";
import { ListFilterPlus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../../../../../components/ui/dropdown-menu";
import { useStore } from "../../../../../lib/store";
import { sleep } from "../../../../../lib/utils";
import { FilterComponent } from "../../shared/Filters/FilterComponent";

export function NewFilterButton({ availableFilters }: { availableFilters?: FilterParameter[] }) {
  const { filters, setFilters } = useStore();

  const [localFilters, setLocalFilters] = useState<Filter[]>(filters);

  const updateLocalFilters = (filter: Filter | null, index: number) => {
    if (filter === null) {
      const newFilters = [...localFilters];
      newFilters.splice(index, 1);
      setLocalFilters(newFilters);
      return;
    }
    const newFilters = [...localFilters];
    newFilters[index] = filter;
    setLocalFilters(newFilters);
  };

  const addLocalFilter = () => {
    setLocalFilters([
      ...localFilters,
      {
        parameter: availableFilters?.[0] || "pathname",
        type: "equals",
        value: [],
      },
    ]);
  };

  const [open, setOpen] = useState(false);

  const onClose = async () => {
    setOpen(false);
    await sleep(100);
  };

  return (
    <DropdownMenu
      onOpenChange={isOpen => {
        setLocalFilters(filters);
        if (!isOpen) {
          onClose();
        }
      }}
      open={open}
    >
      <DropdownMenuTrigger
        size={"sm"}
        onClick={() => {
          if (localFilters.length === 0) {
            addLocalFilter();
          }
          setOpen(true);
        }}
      >
        <ListFilterPlus className="w-4 h-4" />
        Filter
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="flex flex-col p-0 max-w-[95vw]">
        <div className="flex flex-col gap-2 p-3">
          {localFilters.map((filter, index) => (
            <FilterComponent
              key={index}
              filter={filter}
              index={index}
              updateFilter={updateLocalFilters}
              availableFilters={availableFilters}
            />
          ))}
        </div>
        <div className="flex justify-between border-t border-neutral-750 p-3">
          <Button variant={"ghost"} onClick={() => addLocalFilter()} size={"sm"} className="gap-1">
            <Plus className="w-3 h-3" />
            Add Filter
          </Button>
          <Button
            variant={"outline"}
            size={"sm"}
            onClick={() => {
              setFilters(localFilters);
              setOpen(false);
            }}
          >
            Save Filters
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
