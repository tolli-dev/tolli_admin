export function StarDistribution({
  distribution,
}: {
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}) {
  const stars = [5, 4, 3, 2, 1] as const;
  const total = stars.reduce((sum, star) => sum + distribution[star], 0);

  if (total === 0) {
    return <p className="text-sm text-neutral-500">아직 별점이 없어요.</p>;
  }

  return (
    <div className="space-y-1.5">
      {stars.map((star) => {
        const count = distribution[star];
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="w-6 text-xs text-neutral-500">{star}점</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-[#c98500]"
                style={{ width: `${(count / total) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs text-neutral-500">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
