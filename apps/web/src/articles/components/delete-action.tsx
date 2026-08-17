"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@my-knowledge/ui/components/alert-dialog";
import { Button } from "@my-knowledge/ui/components/button";
import { Trash2 } from "@my-knowledge/ui/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DeleteActionProps } from "./delete-action.types";

export function DeleteAction({ id, expectedHash, messages }: DeleteActionProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedHash }),
      });
      if (response.status === 204) {
        router.push("/articles");
        return;
      }
      setError(response.status === 404 ? messages.deleteNotFound : messages.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            aria-label={messages.delete}
            className="h-8 w-8 text-destructive hover:text-destructive"
            size="icon-sm"
            title={messages.delete}
            variant="destructive"
          />
        }
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{messages.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>{messages.deleteDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{messages.cancel}</AlertDialogCancel>
          <AlertDialogAction disabled={isDeleting} onClick={remove} variant="destructive">
            {isDeleting ? messages.deleting : messages.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
