import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { Empty } from "./ui";

export function MeetingList({
  meetings,
}: {
  meetings: { id: string; title: string; startsAt: Date; location: string | null; subtitle?: string }[];
}) {
  if (meetings.length === 0) return <Empty>Nenhuma reunião agendada.</Empty>;
  return (
    <ul className="divide-y divide-line">
      {meetings.map((meeting) => (
        <li key={meeting.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{meeting.title}</p>
            <p className="text-xs text-muted">
              {formatDateTime(meeting.startsAt)} · {meeting.location ?? "Online"}
              {meeting.subtitle ? ` · ${meeting.subtitle}` : ""}
            </p>
          </div>
          <Link href={`/reunioes/${meeting.id}`} className="btn btn-ghost btn-sm">
            Entrar
          </Link>
        </li>
      ))}
    </ul>
  );
}
