"use client";

import { Plus, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode, useState } from "react";
import { updateSiteConfig } from "../api/admin/endpoints/sites";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";

interface TagEditorProps {
  siteId: number;
  currentTags: string[];
  allTags: string[];
  onTagsUpdated: () => void;
  trigger?: ReactNode;
}

export function TagEditor({ siteId, currentTags, allTags, onTagsUpdated, trigger }: TagEditorProps) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(currentTags);
  const [newTagInput, setNewTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Get suggestions - existing tags that aren't already selected
  const suggestions = allTags.filter(tag => !tags.includes(tag));

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && trimmedTag.length <= 50) {
      setTags([...tags, trimmedTag]);
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag(newTagInput);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSiteConfig(siteId, { tags });
      onTagsUpdated();
      setOpen(false);
    } catch (error) {
      console.error("Failed to update tags:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Reset to current tags when opening
      setTags(currentTags);
      setNewTagInput("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("Edit Tags")}</DialogTitle>
          <DialogDescription>{t("Add tags to organize and filter your sites.")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current tags */}
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {tags.length === 0 ? (
              <span className="text-sm text-neutral-500">{t("No tags added yet")}</span>
            ) : (
              tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>

          {/* New tag input */}
          <div className="flex gap-2">
            <Input
              placeholder={t("Type a new tag...")}
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={50}
            />
            <Button
              variant="outline"
              onClick={() => handleAddTag(newTagInput)}
              disabled={!newTagInput.trim()}
            >
              {t("Add")}
            </Button>
          </div>

          {/* Suggestions from existing tags */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-neutral-500">{t("Existing tags:")}</span>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 10).map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    onClick={() => handleAddTag(tag)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} variant="success">
            {isSaving ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
