import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button, ButtonProps } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertCircle } from "lucide-react";

export const ConfirmationModal: React.FC<{
  title: React.ReactNode;
  description: React.ReactNode;
  children?: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (b: boolean) => void;
  onConfirm: () => void;
  primaryAction?: ButtonProps;
}> = ({ title, description, children, isOpen, onConfirm, setIsOpen, primaryAction }) => {
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
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="submit" onClick={() => setIsOpen(false)} variant={"ghost"}>
              Cancel
            </Button>
            <Button type="submit" onClick={onSubmit} {...primaryAction}></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
