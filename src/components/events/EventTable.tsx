import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type EventRow = {
  event: string;
  timestamp: string;
  distinctId: string;
  properties: Record<string, unknown>;
};

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("ko-KR", { hour12: false });
}

export function EventTable({ rows }: { rows: EventRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-500">해당 조건에 맞는 이벤트가 없어요.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-neutral-800">
          <TableHead className="text-neutral-400">이벤트</TableHead>
          <TableHead className="text-neutral-400">시각</TableHead>
          <TableHead className="text-neutral-400">distinct_id</TableHead>
          <TableHead className="text-neutral-400">속성</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${row.distinctId}-${row.timestamp}-${index}`} className="border-neutral-800">
            <TableCell className="font-medium text-neutral-100">{row.event}</TableCell>
            <TableCell className="text-neutral-400 tabular-nums">{formatTimestamp(row.timestamp)}</TableCell>
            <TableCell className="text-neutral-500">{row.distinctId.slice(0, 12)}…</TableCell>
            <TableCell className="max-w-xs truncate text-neutral-500">
              {JSON.stringify(row.properties)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
