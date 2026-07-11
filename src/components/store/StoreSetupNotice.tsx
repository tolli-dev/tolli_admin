export function StoreSetupNotice({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 p-5">
      <p className="text-sm font-medium text-neutral-300">{title} — 아직 설정이 안 됐어요</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-neutral-500">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
