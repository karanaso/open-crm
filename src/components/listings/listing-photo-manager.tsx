/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Images, Trash2 } from "lucide-react";
import {
  deleteListingPhotoAction,
  reorderListingPhotosAction,
  uploadListingPhotoAction,
} from "@/actions/listing-photos";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { FormError, FormField, FormSuccess } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  LISTING_PHOTO_ACCEPT,
  LISTING_PHOTO_MAX_BYTES,
  LISTING_PHOTO_MAX_COUNT,
  listingPhotoPublicPath,
} from "@/lib/validation/listing-photo";
import { cn } from "@/lib/utils";
import { useListingsTranslator } from "@/components/listings/use-listings-translator";

type ManagedPhoto = {
  id: string;
  storageKey: string;
  alt: string | null;
  width: number | null;
  height: number | null;
};

export function movePhoto<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function PhotoCard({
  photo,
  index,
  total,
  busy,
  onMove,
  onDelete,
}: {
  photo: ManagedPhoto;
  index: number;
  total: number;
  busy: boolean;
  onMove: (from: number, to: number) => void;
  onDelete: (photoId: string) => void;
}) {
  const t = useListingsTranslator();
  const tCommon = useTranslations("common");
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: photo.id,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: photo.id });
  const label = photo.alt ?? t("photos.altFallback", { number: index + 1 });

  return (
    <li
      ref={setDropRef}
      className={cn(
        "bg-card rounded-lg border p-2",
        isOver && "border-primary",
        isDragging && "opacity-60",
      )}
    >
      <div
        ref={setNodeRef}
        style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
        className="space-y-2"
      >
        <div className="bg-muted relative overflow-hidden rounded-md border">
          <img
            src={listingPhotoPublicPath(photo.storageKey)}
            alt={label}
            width={photo.width ?? undefined}
            height={photo.height ?? undefined}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
          <span className="bg-background/90 absolute top-2 left-2 rounded px-1.5 py-0.5 text-xs font-medium">
            {index + 1}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-1">
          <button
            type="button"
            className="bg-background text-muted-foreground hover:bg-accent focus-visible:ring-ring inline-flex size-8 cursor-grab items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:outline-none"
            aria-label={t("photos.dragPhoto", { number: index + 1 })}
            {...listeners}
            {...attributes}
          >
            <GripVertical className="size-4" />
          </button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label={t("photos.moveUp", { number: index + 1 })}
              disabled={busy || index === 0}
              onClick={() => onMove(index, index - 1)}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label={t("photos.moveDown", { number: index + 1 })}
              disabled={busy || index === total - 1}
              onClick={() => onMove(index, index + 1)}
            >
              <ArrowDown className="size-4" />
            </Button>
            <ConfirmSubmit
              type="button"
              message={t("photos.deleteConfirm")}
              disabled={busy}
              className="border-input bg-background text-destructive hover:bg-accent focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              aria-label={t("photos.deletePhoto", { number: index + 1 })}
              onClick={() => onDelete(photo.id)}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">{tCommon("delete")}</span>
            </ConfirmSubmit>
          </div>
        </div>
      </div>
    </li>
  );
}

export function ListingPhotoManager({
  listingId,
  photos,
}: {
  listingId: string;
  photos: ManagedPhoto[];
}) {
  const t = useListingsTranslator();
  const router = useRouter();
  const [items, setItems] = useState(photos);
  const [feedback, setFeedback] = useState<ActionState>(null);
  const [ordering, startOrdering] = useTransition();
  const uploadAction = useMemo(() => uploadListingPhotoAction.bind(null, listingId), [listingId]);
  const [uploadState, uploadFormAction, uploading] = useActionState(uploadAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setItems(photos);
  }, [photos]);

  useEffect(() => {
    if (!uploadState?.success) return;
    formRef.current?.reset();
    router.refresh();
  }, [router, uploadState]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function commitOrder(next: ManagedPhoto[]) {
    const previous = items;
    setItems(next);
    setFeedback(null);
    startOrdering(async () => {
      const result = await reorderListingPhotosAction(
        listingId,
        next.map((photo) => photo.id),
      );
      if (result?.error) setItems(previous);
      setFeedback(result);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((photo) => photo.id === active.id);
    const to = items.findIndex((photo) => photo.id === over.id);
    if (from < 0 || to < 0) return;
    commitOrder(movePhoto(items, from, to));
  }

  function handleMove(from: number, to: number) {
    commitOrder(movePhoto(items, from, to));
  }

  function handleDelete(photoId: string) {
    setFeedback(null);
    startOrdering(async () => {
      const result = await deleteListingPhotoAction(photoId);
      if (result?.error) {
        setFeedback(result);
        return;
      }
      setItems((current) => current.filter((photo) => photo.id !== photoId));
      setFeedback(result);
      router.refresh();
    });
  }

  const busy = uploading || ordering;
  const atLimit = items.length >= LISTING_PHOTO_MAX_COUNT;
  const megabytes = Math.round(LISTING_PHOTO_MAX_BYTES / (1024 * 1024));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          {t("photos.count", { count: items.length, max: LISTING_PHOTO_MAX_COUNT })}
        </p>
        <p className="text-muted-foreground text-xs">
          {t("photos.limits", {
            megabytes,
            formats: t("photos.formats"),
          })}
        </p>
      </div>

      <div aria-live="polite" className="space-y-2">
        <FormError message={uploadState?.error} />
        <FormError message={uploadState?.fieldErrors?.file?.[0]} />
        <FormSuccess message={uploadState?.success} />
        <FormError message={feedback?.error} />
        <FormSuccess message={feedback?.success} />
      </div>

      {atLimit ? (
        <p className="text-muted-foreground text-sm">{t("photos.limitReached")}</p>
      ) : (
        <form
          ref={formRef}
          action={uploadFormAction}
          className="bg-muted/20 space-y-3 rounded-lg border p-4"
        >
          <FormField
            label={t("photos.fileLabel")}
            htmlFor="photo-file"
            error={uploadState?.fieldErrors?.file?.[0]}
            hint={t("photos.fileHint")}
            required
          >
            <Input id="photo-file" name="file" type="file" accept={LISTING_PHOTO_ACCEPT} required />
          </FormField>
          <Button type="submit" disabled={busy}>
            <ImagePlus className="size-4" />
            {uploading ? t("photos.uploading") : t("photos.upload")}
          </Button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
          <Images className="text-muted-foreground size-6" />
          <p className="text-muted-foreground text-sm">{t("photos.empty")}</p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">{t("photos.orderHint")}</p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((photo, index) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  total={items.length}
                  busy={busy}
                  onMove={handleMove}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </DndContext>
        </>
      )}
    </div>
  );
}
