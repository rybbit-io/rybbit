"use client";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Expand } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/basic-tabs";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
} from "../../../../components/ui/responsive-dialog";
import { cn } from "../../../../lib/utils";

export type TabbedSectionItem<TValue extends string> = {
  value: TValue;
  label: ReactNode;
  content: ReactNode;
  dialogContent?: ReactNode;
  dialogTitle?: ReactNode;
  showInTabs?: boolean;
};

export type TabbedSectionListContext<TValue extends string> = {
  value: TValue;
  setValue: (value: TValue) => void;
  inDialog: boolean;
};

export type TabbedSectionCardProps<TValue extends string> = {
  defaultValue: TValue;
  tabs: TabbedSectionItem<TValue>[];
  className?: string;
  contentClassName?: string;
  dialogClassName?: string;
  renderTabsListEnd?: (context: TabbedSectionListContext<TValue>) => ReactNode;
};

export function TabbedSectionCard<TValue extends string>({
  defaultValue,
  tabs,
  className,
  contentClassName,
  dialogClassName,
  renderTabsListEnd,
}: TabbedSectionCardProps<TValue>) {
  const [value, setValue] = useState<TValue>(defaultValue);
  const [expanded, setExpanded] = useState(false);

  const visibleTabs = useMemo(() => tabs.filter(tab => tab.showInTabs !== false), [tabs]);
  const dialogTabs = useMemo(() => tabs.filter(tab => tab.dialogContent), [tabs]);
  const activeDialogTab = dialogTabs.find(tab => tab.value === value) ?? dialogTabs[0];
  const dialogValue = activeDialogTab?.value ?? value;
  const canExpand = dialogTabs.some(tab => tab.value === value);

  const renderTabsList = (inDialog: boolean) => {
    const listTabs = inDialog ? dialogTabs.filter(tab => tab.showInTabs !== false) : visibleTabs;

    return (
      <TabsList>
        {listTabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
        {renderTabsListEnd?.({ value, setValue, inDialog })}
      </TabsList>
    );
  };

  const handleOpenChange = (open: boolean) => {
    setExpanded(open);
  };

  return (
    <>
      <Card className={cn("h-[405px]", className)}>
        <CardContent className={cn("mt-2", contentClassName)}>
          <Tabs defaultValue={defaultValue} value={value} onValueChange={nextValue => setValue(nextValue as TValue)}>
            <div className="flex flex-row gap-2 justify-between items-center">
              <div className="overflow-x-auto">{renderTabsList(false)}</div>
              <div className="w-7">
                {canExpand && (
                  <Button size="smIcon" onClick={() => setExpanded(true)} aria-label="Expand section">
                    <Expand className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            {tabs.map(tab => (
              <TabsContent key={tab.value} value={tab.value}>
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      {activeDialogTab && (
        <ResponsiveDialog open={expanded} onOpenChange={handleOpenChange}>
          <ResponsiveDialogContent
            className={cn(
              "max-w-[1000px] w-screen max-h-[1000px] h-[calc(100vh-2rem)] overflow-hidden p-2 sm:p-4 flex flex-col gap-2",
              dialogClassName
            )}
          >
            <VisuallyHidden>
              <ResponsiveDialogTitle>{activeDialogTab.dialogTitle ?? activeDialogTab.label}</ResponsiveDialogTitle>
            </VisuallyHidden>
            <Tabs
              defaultValue={defaultValue}
              value={dialogValue}
              onValueChange={nextValue => setValue(nextValue as TValue)}
              className="min-h-0 flex flex-1 flex-col gap-2 overflow-hidden"
            >
              <div className="overflow-x-auto pr-8">{renderTabsList(true)}</div>
              {dialogTabs.map(tab => (
                <TabsContent
                  key={tab.value}
                  value={tab.value}
                  className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
                >
                  {tab.dialogContent}
                </TabsContent>
              ))}
            </Tabs>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      )}
    </>
  );
}
