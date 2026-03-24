export default function EmptyStateMobile({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{description}</div>
      {actionLabel ? (
        <button type="button" onClick={onAction} className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
