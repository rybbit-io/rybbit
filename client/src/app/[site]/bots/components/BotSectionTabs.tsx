"use client";

import { ReactNode } from "react";
import {
  TabbedSectionCard,
  type TabbedSectionCardProps,
  type TabbedSectionItem,
} from "../../components/shared/TabbedSectionCard";
import { BotSection, BotSectionDialogBody, type BotSectionBaseProps } from "./BotSection";

export type BotSectionTab<TValue extends string> = {
  value: TValue;
  label: ReactNode;
  section: BotSectionBaseProps;
  showInTabs?: boolean;
  dialogTitle?: ReactNode;
};

type BotSectionTabsProps<TValue extends string> = Omit<TabbedSectionCardProps<TValue>, "tabs"> & {
  tabs: BotSectionTab<TValue>[];
};

export function BotSectionTabs<TValue extends string>({ tabs, ...props }: BotSectionTabsProps<TValue>) {
  const tabItems: TabbedSectionItem<TValue>[] = tabs.map(tab => ({
    value: tab.value,
    label: tab.label,
    showInTabs: tab.showInTabs,
    dialogTitle: tab.dialogTitle ?? tab.section.title,
    content: <BotSection {...tab.section} renderDialog={false} />,
    dialogContent: <BotSectionDialogBody {...tab.section} />,
  }));

  return <TabbedSectionCard {...props} tabs={tabItems} />;
}
