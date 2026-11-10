import { KIND_LABEL } from "@/lib/format";
import type { Plan } from "@/lib/types";

type Props = { plan: Plan; written: Record<number, string> };

export function PlanPanel({ plan, written }: Props) {
  return (
    <section aria-label="Contents" className="set-in">
      <h2 className="label">Contents</h2>
      <p className="mt-3 font-display text-[1.6rem] leading-[1.08] text-balance">{plan.blog_title}</p>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[0.68rem] text-ink-2">
        <dt className="text-muted">For</dt>
        <dd>{plan.audience}</dd>
        <dt className="text-muted">Tone</dt>
        <dd>{plan.tone}</dd>
        <dt className="text-muted">Kind</dt>
        <dd>{KIND_LABEL[plan.blog_kind]}</dd>
      </dl>

      <ol className="mt-4 space-y-2">
        {plan.tasks.map((task, i) => {
          const done = task.id in written;
          return (
            <li key={task.id} className="flex items-baseline gap-2.5">
              <span className="w-6 shrink-0 font-mono text-[0.68rem] text-accent">§{i + 1}</span>
              <span className={`font-serif text-[0.95rem] leading-snug ${done ? "text-ink" : "text-muted"}`}>
                {task.title}
              </span>
              <span aria-hidden className="mb-1 min-w-4 flex-1 border-b border-dotted border-rule" />
              <span className={`shrink-0 font-mono text-[0.62rem] tracking-[0.12em] uppercase ${done ? "text-ink" : "text-muted"}`}>
                {done ? "set" : `${task.target_words}w`}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
