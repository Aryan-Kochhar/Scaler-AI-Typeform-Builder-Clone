import { Database, Mail, MessageCircle, Sheet, Webhook, Zap } from "lucide-react";
import { ComingSoonBadge } from "@/components/ui/Brand";

const INTEGRATIONS = [
  { icon: Sheet, name: "Google Sheets", text: "Send responses to a spreadsheet" },
  { icon: MessageCircle, name: "Slack", text: "Get notified in a channel" },
  { icon: Webhook, name: "Webhooks", text: "POST each response to your endpoint" },
  { icon: Zap, name: "Zapier", text: "Connect to 5,000+ apps" },
  { icon: Mail, name: "Mailchimp", text: "Grow your audience lists" },
  { icon: Database, name: "HubSpot", text: "Create contacts automatically" },
];

export default function ConnectPage() {
  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Connect</h1>
        <p className="mt-1 text-sm text-ink-soft">Send your data where it needs to go. Integrations are coming soon.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map(({ icon: Icon, name, text }) => (
            <div key={name} className="rounded-xl border border-line bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f4f3] text-ink">
                  <Icon size={20} />
                </span>
                <ComingSoonBadge />
              </div>
              <p className="mt-3 font-medium text-ink">{name}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
