import { resolveTheme } from "@/lib/themes";
import type { Theme } from "@/lib/types";

/** Tiny visual of a form's theme, used in list rows and grid cards. */
export function FormThumb({ theme, title, large }: { theme: Partial<Theme>; title: string; large?: boolean }) {
  const t = resolveTheme(theme);
  if (!large) {
    return (
      <span
        className="flex h-10 w-10 shrink-0 items-end justify-start rounded-md p-1.5 ring-1 ring-black/5"
        style={{ background: t.background }}
      >
        <span className="h-1.5 w-5 rounded-sm" style={{ background: t.button }} />
      </span>
    );
  }
  return (
    <div className="flex h-36 flex-col justify-center gap-2 px-5" style={{ background: t.background, fontFamily: `"${t.font}"` }}>
      <p className="line-clamp-2 text-[15px] leading-5" style={{ color: t.question }}>
        {title}
      </p>
      <span className="h-4 w-10 rounded-sm" style={{ background: t.button }} />
    </div>
  );
}
