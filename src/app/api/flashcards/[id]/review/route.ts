import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUserAndParams } from "@/lib/api/route";
import { reviewCard } from "@/lib/learning/service";
import { RATINGS } from "@/lib/learning/srs";

const reviewSchema = z.object({
  rating: z.enum(RATINGS),
});

/**
 * Records a review.
 *
 * Scheduling is computed server-side rather than sent by the client, so the
 * SM-2 implementation exists once and a modified client cannot write an
 * arbitrary interval.
 */
export const POST = withUserAndParams<{ id: string }>(
  async ({ user, request, params }) => {
    // A fast reviewer does a card every two seconds; this allows well above
    // that while still bounding a script.
    assertRateLimit(user.id, "flashcard-review", 120, 60_000);

    const body = await parseBody(request, reviewSchema);

    const result = await reviewCard({
      userId: user.id,
      cardId: params.id,
      rating: body.rating,
    });

    if (!result.ok) return apiError("not_found");

    return apiSuccess({
      intervalDays: result.intervalDays,
      dueAt: result.dueAt,
    });
  },
  { name: "flashcards.review" },
);
