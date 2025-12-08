"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { filterOperators, filterParameters, usePlaygroundStore } from "../hooks/usePlaygroundStore";

export function FilterBuilder() {
  const { filters, addFilter, updateFilter, removeFilter } = usePlaygroundStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Filters</label>
        <Button variant="ghost" size="sm" onClick={addFilter} className="h-7 px-2 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add Filter
        </Button>
      </div>

      {filters.length === 0 ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          No filters applied. Click &quot;Add Filter&quot; to add one.
        </p>
      ) : (
        <div className="space-y-2">
          {filters.map((filter, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={filter.parameter}
                onValueChange={value => updateFilter(index, { ...filter, parameter: value })}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Parameter" />
                </SelectTrigger>
                <SelectContent>
                  {filterParameters.map(param => (
                    <SelectItem key={param.value} value={param.value} className="text-xs">
                      {param.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.operator}
                onValueChange={value => updateFilter(index, { ...filter, operator: value })}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {filterOperators.map(op => (
                    <SelectItem key={op.value} value={op.value} className="text-xs">
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={filter.value}
                onChange={e => updateFilter(index, { ...filter, value: e.target.value })}
                placeholder="Value"
                className="flex-1 h-8 text-xs"
              />

              <Button
                variant="ghost"
                onClick={() => removeFilter(index)}
                className="h-5 w-5 p-0 text-neutral-500 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
