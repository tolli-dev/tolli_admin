import Image from "next/image";
import type { InstagramMedia } from "@/lib/instagram/client";

function count(value: number | null) {
  return value?.toLocaleString("ko-KR") ?? "—";
}

export function MediaGrid({ media }: { media: InstagramMedia[] }) {
  if (media.length === 0) {
    return <p className="text-sm text-neutral-500">아직 게시물이 없어요.</p>;
  }

  // 저장·공유가 실제 확산 신호라, 어떤 게시물이 먹혔는지 보려면 좋아요보다
  // 이쪽이 낫다. 정렬은 건드리지 않고(최신순 유지) 수치만 붙인다.
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {media.map((item) => (
        <a
          key={item.id}
          href={item.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 transition-colors hover:border-neutral-700"
        >
          <div className="relative aspect-square overflow-hidden rounded-md bg-neutral-800">
            {item.thumbnailUrl ? (
              <Image
                src={item.thumbnailUrl}
                alt={item.caption?.slice(0, 60) ?? "인스타그램 게시물"}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-opacity group-hover:opacity-90"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-xs text-neutral-600">
                미리보기 없음
              </span>
            )}
            <span className="absolute left-2 top-2 rounded bg-neutral-950/70 px-1.5 py-0.5 text-[10px] text-neutral-300">
              {item.contentTypeLabel}
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-neutral-600">도달</dt>
              <dd className="tabular-nums text-neutral-300">{count(item.reach)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">조회</dt>
              <dd className="tabular-nums text-neutral-300">{count(item.views)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">저장</dt>
              <dd className="tabular-nums text-neutral-300">{count(item.saved)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">공유</dt>
              <dd className="tabular-nums text-neutral-300">{count(item.shares)}</dd>
            </div>
          </dl>

          <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
            <span>♥ {count(item.likeCount)}</span>
            <span>💬 {count(item.commentsCount)}</span>
          </div>
          {item.timestamp && (
            <p className="mt-1 text-[11px] text-neutral-600">
              {new Date(item.timestamp).toLocaleDateString("ko-KR")}
            </p>
          )}
          {item.caption && (
            <p className="mt-2 line-clamp-2 text-xs text-neutral-500">{item.caption}</p>
          )}
        </a>
      ))}
    </div>
  );
}
