import { AlertCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import React, { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button, ButtonProps } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export const ConfirmationModal: React.FC<{
  title: React.ReactNode;
  description: React.ReactNode;
  children?: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (b: boolean) => void;
  onConfirm: () => void;
  primaryAction?: ButtonProps;
}> = ({ title, description, children, isOpen, onConfirm, setIsOpen, primaryAction }) => {
  const t = useExtracted();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    try {
      await onConfirm();
      setIsOpen(false);
    } catch (error) {
      setError(String(error));
    }
  };

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={e => setIsOpen(e)}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("Error")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="submit" onClick={() => setIsOpen(false)} variant={"ghost"}>
              {t("Cancel")}
            </Button>
            <Button type="submit" onClick={onSubmit} {...primaryAction}></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
