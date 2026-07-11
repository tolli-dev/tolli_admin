function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[#c98500]" aria-label={`${rating}점`}>
      {"★".repeat(rating)}
      <span className="text-neutral-700">{"★".repeat(Math.max(5 - rating, 0))}</span>
    </span>
  );
}

export function ReviewList({
  reviews,
}: {
  reviews: { reviewId: string; authorName: string; text: string; rating: number; at: string | null }[];
}) {
  if (reviews.length === 0) {
    return <p className="text-sm text-neutral-500">최근 리뷰가 없어요.</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.reviewId} className="border-b border-neutral-800 pb-4 last:border-0 last:pb-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-200">{review.authorName}</span>
            <Stars rating={review.rating} />
          </div>
          {review.text && <p className="mt-1 text-sm text-neutral-500">{review.text}</p>}
          {review.at && (
            <p className="mt-1 text-xs text-neutral-600">{new Date(review.at).toLocaleDateString("ko-KR")}</p>
          )}
        </div>
      ))}
    </div>
  );
}
