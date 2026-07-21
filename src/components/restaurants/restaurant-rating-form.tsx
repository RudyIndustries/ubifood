"use client";

import { useState } from "react";
import { LoaderCircle, Star, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import {
  deleteRestaurantRatingAction,
  saveRestaurantRatingAction,
} from "@/app/restaurantes/[slug]/actions";

type RestaurantRatingFormProps = {
  restaurantId: string;
  defaultRating?: number;
  defaultComment?: string | null;
  hasRating?: boolean;
};

function SubmitButton({ hasRating, disabled }: { hasRating: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending || disabled}
      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#211c18] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending && <LoaderCircle className="animate-spin" size={17} />}
      {pending ? "Guardando" : hasRating ? "Actualizar calificacion" : "Publicar calificacion"}
    </button>
  );
}

export function RestaurantRatingForm({
  restaurantId,
  defaultRating = 0,
  defaultComment = "",
  hasRating = false,
}: RestaurantRatingFormProps) {
  const [rating, setRating] = useState(defaultRating);
  const [comment, setComment] = useState(defaultComment ?? "");

  return (
    <div className="rounded-lg bg-white p-4 shadow-lg shadow-black/5">
      <p className="text-sm font-black">{hasRating ? "Edita tu experiencia" : "¿Como estuvo tu experiencia?"}</p>
      <form action={saveRestaurantRatingAction} className="mt-3">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <input type="hidden" name="rating" value={rating} />
        <div className="flex gap-1" role="radiogroup" aria-label="Calificacion de una a cinco estrellas">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
              onClick={() => setRating(value)}
              className="grid size-10 place-items-center rounded-md transition hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#f9c74f]/30"
            >
              <Star
                size={27}
                fill={value <= rating ? "#f9c74f" : "transparent"}
                className={value <= rating ? "text-[#d99800]" : "text-black/20"}
              />
            </button>
          ))}
        </div>
        <textarea
          name="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value.slice(0, 500))}
          className="mt-3 min-h-24 w-full rounded-lg border border-black/10 bg-[#f7f4ed] px-3 py-2 text-sm font-semibold outline-none ring-[#f9c74f]/25 focus:ring-4"
          placeholder="Cuenta que te gusto o que podria mejorar (opcional)"
          maxLength={500}
        />
        <div className="mt-1 text-right text-xs font-bold text-black/35">{comment.length}/500</div>
        <div className="mt-3 flex gap-2">
          <SubmitButton hasRating={hasRating} disabled={rating === 0} />
        </div>
      </form>
      {hasRating && (
        <form action={deleteRestaurantRatingAction} className="mt-2">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <button className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black text-[#a32323] hover:bg-[#fff0ed]">
            <Trash2 size={15} /> Eliminar mi calificacion
          </button>
        </form>
      )}
    </div>
  );
}
