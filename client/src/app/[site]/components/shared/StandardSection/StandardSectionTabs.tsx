"use client";

import { ReactNode } from "react";
import { TabbedSectionCard, type TabbedSectionCardProps, type TabbedSectionItem } from "../TabbedSectionCard";
import { StandardSection, type StandardSectionBaseProps } from "./StandardSection";
import { StandardSectionDialogBody } from "./StandardSectionDialog";

export type StandardSectionTab<TValue extends string> = {
  value: TValue;
  label: ReactNode;
  showInTabs?: boolean;
  dialogTitle?: ReactNode;
} & (
  | {
      section: StandardSectionBaseProps;
      content?: never;
      dialogContent?: never;
    }
  | {
      content: ReactNode;
      dialogContent?: ReactNode;
      section?: never;
    }
);

type StandardSectionTabsProps<TValue extends string> = Omit<TabbedSectionCardProps<TValue>, "tabs"> & {
  tabs: StandardSectionTab<TValue>[];
};

export function StandardSectionTabs<TValue extends string>({ tabs, ...props }: StandardSectionTabsProps<TValue>) {
  const tabItems: TabbedSectionItem<TValue>[] = tabs.map(tab => {
    if (tab.section) {
      const { section } = tab;

      return {
        value: tab.value,
        label: tab.label,
        showInTabs: tab.showInTabs,
        dialogTitle: tab.dialogTitle ?? section.title,
        content: <StandardSection {...section} renderDialog={false} />,
        dialogContent: <StandardSectionDialogBody {...section} />,
      };
    }

    return {
      value: tab.value,
      label: tab.label,
      showInTabs: tab.showInTabs,
      dialogTitle: tab.dialogTitle,
      content: tab.content,
      dialogContent: tab.dialogContent,
    };
  });

  return <TabbedSectionCard {...props} tabs={tabItems} />;
}
