import Link from "next/link";
import { ADMIN_AUDIT_ACTIONS, formatAdminAuditAction } from "@/lib/audit";
import { getAdminAuditLogs } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getMetadataEntries(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [] as Array<[string, unknown]>;
  }

  return Object.entries(metadata as Record<string, unknown>);
}

export default async function AdminAuditPage() {
  const logs = await getAdminAuditLogs();
  const lifecycleActions = new Set<string>([
    ADMIN_AUDIT_ACTIONS.USER_SUSPENDED,
    ADMIN_AUDIT_ACTIONS.USER_RESTORED,
    ADMIN_AUDIT_ACTIONS.USER_DELETED,
  ]);
  const roleChanges = logs.filter((log) => log.action === ADMIN_AUDIT_ACTIONS.USER_ROLE_CHANGED).length;
  const sessionRevocations = logs.filter((log) => log.action === ADMIN_AUDIT_ACTIONS.USER_SESSIONS_REVOKED).length;
  const accountLifecycleEvents = logs.filter((log) => lifecycleActions.has(log.action)).length;
  const commentModerationEvents = logs.filter((log) => log.action === ADMIN_AUDIT_ACTIONS.COMMENT_MODERATED).length;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="section-kicker">Audit</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Admin Audit Trail</h1>
        <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
          Review privileged admin operations across user management and moderation. The newest entries are shown first.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Loaded Entries</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{logs.length}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Role Changes</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{roleChanges}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Session Revokes</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{sessionRevocations}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Lifecycle & Moderation</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">
            {accountLifecycleEvents + commentModerationEvents}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {logs.length ? (
          logs.map((log) => {
            const metadataEntries = getMetadataEntries(log.metadata);

            return (
              <article key={log.id} className="glass-card rounded-[2rem] p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4 xl:max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-soft)]">
                      <span className="badge-soft">{formatAdminAuditAction(log.action)}</span>
                      <span>{formatDate(log.createdAt, "yyyy-MM-dd HH:mm")}</span>
                      {log.actor ? (
                        <Link href={`/admin/users/${log.actor.id}`} className="font-semibold text-[var(--accent-strong)]">
                          {log.actor.name}
                        </Link>
                      ) : (
                        <span>System actor</span>
                      )}
                      {log.targetUser ? (
                        <>
                          <span>to</span>
                          <Link href={`/admin/users/${log.targetUser.id}`} className="font-semibold text-[var(--accent-strong)]">
                            {log.targetUser.name}
                          </Link>
                        </>
                      ) : null}
                    </div>
                    <p className="text-sm leading-7 text-[var(--ink-soft)]">{log.summary}</p>
                    {metadataEntries.length ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {metadataEntries.map(([key, value]) => (
                          <div key={key} className="rounded-[1.2rem] bg-[rgba(20,33,43,0.03)] px-3 py-2 text-xs leading-6 text-[var(--ink-soft)]">
                            <span className="font-semibold text-[var(--ink)]">{key}:</span> {formatMetadataValue(value)}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-[1.4rem] border border-black/8 bg-white/70 px-4 py-3 text-sm leading-7 text-[var(--ink-soft)] xl:min-w-[18rem]">
                    <div>Actor: {log.actor ? log.actor.email : "system"}</div>
                    <div>Target: {log.targetUser ? log.targetUser.email : "n/a"}</div>
                    <div>Action key: {log.action}</div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[1.8rem] border border-dashed border-black/10 bg-white/60 px-5 py-6 text-sm leading-7 text-[var(--ink-soft)]">
            No audit events have been recorded yet. Once admins start moderating users or comments, entries will appear here.
          </div>
        )}
      </div>
    </div>
  );
}