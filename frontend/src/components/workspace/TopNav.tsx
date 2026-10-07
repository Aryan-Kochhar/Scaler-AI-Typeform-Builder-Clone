"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, Logo } from "@/components/ui/Brand";
import { Menu } from "@/components/ui/Menu";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export function TopNav() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    api.me().then(setUser).catch(() => {});
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-5">
      <Logo />
      <div className="flex items-center gap-2">
        <button className="btn-secondary !h-8 !px-3" onClick={() => toast("Plans & billing are coming soon")}>
          View plans
        </button>
        <button className="btn-ghost" aria-label="Help" onClick={() => toast("Help center is coming soon")}>
          <CircleHelp size={18} />
        </button>
        <Menu
          trigger={({ toggle }) => (
            <button onClick={toggle} className="flex items-center gap-2 rounded-full p-0.5 hover:bg-black/5" aria-label="Account">
              <Avatar name={user?.name ?? "Creator"} />
            </button>
          )}
          items={[
            { label: user ? `${user.name} · ${user.email}` : "Account", onSelect: () => {} },
            { label: "Account settings", onSelect: () => toast("Account settings are coming soon"), divider: true },
            { label: "Log out", onSelect: () => toast("Authentication is simplified in this demo") },
          ]}
        />
      </div>
    </header>
  );
}
