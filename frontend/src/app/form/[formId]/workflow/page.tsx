import { GitBranch, Calculator, Variable } from "lucide-react";
import { ComingSoonBadge } from "@/components/ui/Brand";

export default function WorkflowPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1ecfe] text-accent">
          <GitBranch size={26} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Logic & workflows</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Branch people to different questions based on their answers, calculate scores and set variables.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-left">
          {[
            { icon: GitBranch, label: "Logic jumps / branching" },
            { icon: Calculator, label: "Scoring & calculations" },
            { icon: Variable, label: "Variables & hidden fields" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-ink">
                <Icon size={16} /> {label}
              </span>
              <ComingSoonBadge />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
