import Link from "next/link";
import { notFound } from "next/navigation";
import {
  changeUserRoleAction,
  deleteUserAction,
  muteUserAction,
  restoreUserAction,
  revokeUserSessionsAction,
  suspendUserAction,
  unmuteUserAction,
} from "@/lib/actions/user-actions";
import { userManagementErrorMap, userManagementNoticeMap } from "@/lib/admin-user-management";
import { requireAdmin } from "@/lib/auth";
import { formatAdminAuditAction } from "@/lib/audit";
import { getAdminUserById } from "@/lib/queries";
import { formatUserRole, formatUserStatus, isUserMuted } from "@/lib/user-state";
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

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const currentUser = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const user = await getAdminUserById(id);

  if (!user) {
    notFound();
  }

  const redirectTo = `/admin/users/${user.id}`;
  const isSelf = currentUser.id === user.id;
  const muted = isUserMuted(user.mutedUntil);
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link href="/admin/users" className="text-sm font-semibold text-[var(--accent-strong)]">
          Back to user management
        </Link>
        <div className="space-y-3">
          <p className="section-kicker">User Detail</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-4xl font-semibold tracking-tight">{user.name}</h1>
            <span className="badge-soft">{formatUserRole(user.role)}</span>
            <span className="badge-soft">{formatUserStatus(user.status)}</span>
            {muted ? <span className="badge-soft bg-[rgba(168,123,53,0.1)] text-[var(--gold)]">Muted</span> : null}
            {isSelf ? <span className="badge-soft">Current session</span> : null}
          </div>
          <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            Review recent sessions, authored content, comment activity, and the full admin audit trail for this user.
          </p>
          <p className="text-sm text-[var(--ink-soft)]">{user.email}</p>
        </div>
      </div>

      {query.notice && userManagementNoticeMap[query.notice] ? (
        <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          {userManagementNoticeMap[query.notice]}
        </div>
      ) : null}

      {query.error && userManagementErrorMap[query.error] ? (
        <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          {userManagementErrorMap[query.error]}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Posts</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{user._count.posts}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Comments</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{user._count.comments}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Sessions</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{user._count.sessions}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Audit Records</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{user._count.auditLogsTargeted}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Admin Actions</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{user._count.auditLogsAuthored}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Account Snapshot</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                <div>Created: {formatDate(user.createdAt, "yyyy-MM-dd HH:mm")}</div>
                <div>Updated: {formatDate(user.updatedAt, "yyyy-MM-dd HH:mm")}</div>
                <div>Last login: {user.lastLoginAt ? formatDate(user.lastLoginAt, "yyyy-MM-dd HH:mm") : "Never"}</div>
                <div>Deleted at: {user.deletedAt ? formatDate(user.deletedAt, "yyyy-MM-dd HH:mm") : "Not deleted"}</div>
              </div>
              <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                <div>Status: {formatUserStatus(user.status)}</div>
                <div>Role: {formatUserRole(user.role)}</div>
                <div>Current mute: {muted ? formatDate(user.mutedUntil, "yyyy-MM-dd HH:mm") : "Not muted"}</div>
                <div>Mute reason: {user.muteReason ?? "n/a"}</div>
              </div>
            </div>
            {user.statusReason ? (
              <div className="mt-4 rounded-[1.4rem] bg-[rgba(20,33,43,0.03)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                Status reason: {user.statusReason}
              </div>
            ) : null}
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Sessions</p>
                <h2 className="font-serif text-2xl font-semibold tracking-tight">Recent Sessions</h2>
              </div>
              <span className="text-sm text-[var(--ink-soft)]">{user.sessions.length} recent row(s)</span>
            </div>
            <div className="mt-5 space-y-3">
              {user.sessions.length ? (
                user.sessions.map((session) => (
                  <article key={session.id} className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--ink)]">Session {session.id.slice(0, 8)}</span>
                      <span className="badge-soft">{session.expiresAt > now ? "Valid" : "Expired"}</span>
                    </div>
                    <div className="mt-2">Created: {formatDate(session.createdAt, "yyyy-MM-dd HH:mm")}</div>
                    <div>Last updated: {formatDate(session.updatedAt, "yyyy-MM-dd HH:mm")}</div>
                    <div>Expires: {formatDate(session.expiresAt, "yyyy-MM-dd HH:mm")}</div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                  No sessions are currently stored for this account.
                </div>
              )}
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <div className="space-y-2">
              <p className="section-kicker">Audit</p>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Recent Audit Activity About This User</h2>
            </div>
            <div className="mt-5 space-y-4">
              {user.auditLogsTargeted.length ? (
                user.auditLogsTargeted.map((log) => {
                  const metadataEntries = getMetadataEntries(log.metadata);

                  return (
                    <article key={log.id} className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-soft)]">
                        <span className="badge-soft">{formatAdminAuditAction(log.action)}</span>
                        <span>{formatDate(log.createdAt, "yyyy-MM-dd HH:mm")}</span>
                        {log.actor ? (
                          <Link href={`/admin/users/${log.actor.id}`} className="font-semibold text-[var(--accent-strong)]">
                            {log.actor.name}
                          </Link>
                        ) : (
                          <span>System</span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{log.summary}</p>
                      {metadataEntries.length ? (
                        <div className="mt-4 grid gap-2 md:grid-cols-2">
                          {metadataEntries.map(([key, value]) => (
                            <div key={key} className="rounded-[1.2rem] bg-[rgba(20,33,43,0.03)] px-3 py-2 text-xs leading-6 text-[var(--ink-soft)]">
                              <span className="font-semibold text-[var(--ink)]">{key}:</span> {formatMetadataValue(value)}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                  No audit events have been recorded for this account yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Management Controls</h2>

            <div className="mt-5 space-y-4">
              <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                <h3 className="font-semibold text-[var(--ink)]">Role Controls</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.status !== "DELETED" && user.role === "READER" && !isSelf ? (
                    <form
                      action={changeUserRoleAction}
                      data-confirm-message={`Promote ${user.name} to admin? This grants full admin console access.`}
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="role" value="ADMIN" />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button type="submit" className="btn-secondary">Promote to admin</button>
                    </form>
                  ) : null}
                  {user.status !== "DELETED" && user.role === "ADMIN" && !isSelf ? (
                    <form
                      action={changeUserRoleAction}
                      data-confirm-message={`Downgrade ${user.name} to reader? This removes admin console access.`}
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="role" value="READER" />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button type="submit" className="btn-secondary">Downgrade to reader</button>
                    </form>
                  ) : null}
                  {isSelf ? <p className="text-sm text-[var(--ink-soft)]">You cannot change your own role.</p> : null}
                </div>
              </section>

              <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                <h3 className="font-semibold text-[var(--ink)]">Comment Controls</h3>
                {user.status === "ACTIVE" && !isSelf ? (
                  <>
                    <form
                      action={muteUserAction}
                      className="mt-3 space-y-3"
                      data-confirm-message={`Apply a comment mute to ${user.name}? Make sure the mute length and reason are correct.`}
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <div className="grid gap-3 md:grid-cols-[7rem_1fr]">
                        <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                          <span>Mute days</span>
                          <input name="days" type="number" min={1} max={365} defaultValue={7} className="field" />
                        </label>
                        <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                          <span>Reason</span>
                          <input name="reason" className="field" placeholder="Spam, abuse, low-quality comments..." />
                        </label>
                      </div>
                      <button type="submit" className="btn-secondary">Apply mute</button>
                    </form>
                    {muted ? (
                      <form
                        action={unmuteUserAction}
                        className="mt-3"
                        data-confirm-message={`Remove the current mute for ${user.name}?`}
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <button type="submit" className="btn-secondary">Remove mute</button>
                      </form>
                    ) : null}
                  </>
                ) : muted && !isSelf ? (
                  <form
                    action={unmuteUserAction}
                    className="mt-3"
                    data-confirm-message={`Remove the current mute for ${user.name}?`}
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <button type="submit" className="btn-secondary">Remove mute</button>
                  </form>
                ) : isSelf ? (
                  <p className="mt-3 text-sm text-[var(--ink-soft)]">The current admin account cannot mute itself.</p>
                ) : (
                  <p className="mt-3 text-sm text-[var(--ink-soft)]">Only active accounts can receive a mute.</p>
                )}
              </section>

              <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                <h3 className="font-semibold text-[var(--ink)]">Session Controls</h3>
                {!isSelf ? (
                  <form
                    action={revokeUserSessionsAction}
                    className="mt-3 space-y-3"
                    data-confirm-message={`Revoke every active session for ${user.name}? They will need to sign in again on all devices.`}
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                      <span>Reason</span>
                      <input name="reason" className="field" placeholder="Security rotation, device cleanup, suspected compromise..." />
                    </label>
                    <button type="submit" className="btn-secondary">Revoke all sessions</button>
                  </form>
                ) : (
                  <p className="mt-3 text-sm text-[var(--ink-soft)]">The current admin session cannot revoke itself from here.</p>
                )}
              </section>

              <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                <h3 className="font-semibold text-[var(--ink)]">Account Status</h3>
                {user.status === "ACTIVE" && !isSelf ? (
                  <>
                    <form
                      action={suspendUserAction}
                      className="mt-3 space-y-3"
                      data-confirm-message={`Suspend sign-in for ${user.name}? This blocks new logins until the account is restored.`}
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                        <span>Suspend reason</span>
                        <input name="reason" className="field" placeholder="Abuse, compromised account, policy violation..." />
                      </label>
                      <button type="submit" className="btn-secondary">Suspend sign-in</button>
                    </form>
                    <form
                      action={deleteUserAction}
                      className="mt-3 space-y-3"
                      data-confirm-message={`Soft delete ${user.name}? Their account will be hidden and sign-in will be disabled until restored.`}
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                        <span>Delete reason</span>
                        <input name="reason" className="field" placeholder="Soft delete while keeping references for audit" />
                      </label>
                      <button type="submit" className="btn-secondary text-rose-700">Soft delete user</button>
                    </form>
                  </>
                ) : user.status !== "ACTIVE" ? (
                  <form
                    action={restoreUserAction}
                    className="mt-3"
                    data-confirm-message={`Restore ${user.name}? This will re-enable the account and allow access again.`}
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <button type="submit" className="btn-secondary">Restore account</button>
                  </form>
                ) : isSelf ? (
                  <p className="mt-3 text-sm text-[var(--ink-soft)]">You cannot suspend or delete your own account.</p>
                ) : null}
              </section>
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <div className="space-y-2">
              <p className="section-kicker">Content</p>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Recent Posts</h2>
            </div>
            <div className="mt-5 space-y-3">
              {user.posts.length ? (
                user.posts.map((post) => (
                  <article key={post.id} className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/admin/posts/${post.id}`} className="font-semibold text-[var(--ink)]">
                        {post.title}
                      </Link>
                      <span className="badge-soft">{post.status}</span>
                    </div>
                    <div className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                      Updated: {formatDate(post.updatedAt, "yyyy-MM-dd HH:mm")}
                    </div>
                    <div className="text-sm leading-7 text-[var(--ink-soft)]">
                      Published: {post.publishedAt ? formatDate(post.publishedAt, "yyyy-MM-dd HH:mm") : "Not published"}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                  No recent posts from this user.
                </div>
              )}
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <div className="space-y-2">
              <p className="section-kicker">讨论</p>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Recent Comments</h2>
            </div>
            <div className="mt-5 space-y-3">
              {user.comments.length ? (
                user.comments.map((comment) => (
                  <article key={comment.id} className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/blog/${comment.post.slug}`} className="font-semibold text-[var(--ink)]">
                        {comment.post.title}
                      </Link>
                      <span className="badge-soft">{comment.status}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{comment.content}</p>
                    <div className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                      Created: {formatDate(comment.createdAt, "yyyy-MM-dd HH:mm")}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                  No recent comments from this user.
                </div>
              )}
            </div>
          </section>

          {user.auditLogsAuthored.length ? (
            <section className="glass-card rounded-[2rem] p-6">
              <div className="space-y-2">
                <p className="section-kicker">Admin Activity</p>
                <h2 className="font-serif text-2xl font-semibold tracking-tight">Recent Actions Performed By This User</h2>
              </div>
              <div className="mt-5 space-y-3">
                {user.auditLogsAuthored.map((log) => {
                  const metadataEntries = getMetadataEntries(log.metadata);

                  return (
                    <article key={log.id} className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-soft)]">
                        <span className="badge-soft">{formatAdminAuditAction(log.action)}</span>
                        <span>{formatDate(log.createdAt, "yyyy-MM-dd HH:mm")}</span>
                        {log.targetUser ? (
                          <Link href={`/admin/users/${log.targetUser.id}`} className="font-semibold text-[var(--accent-strong)]">
                            {log.targetUser.name}
                          </Link>
                        ) : (
                          <span>System target</span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{log.summary}</p>
                      {metadataEntries.length ? (
                        <div className="mt-4 grid gap-2">
                          {metadataEntries.map(([key, value]) => (
                            <div key={key} className="rounded-[1.2rem] bg-[rgba(20,33,43,0.03)] px-3 py-2 text-xs leading-6 text-[var(--ink-soft)]">
                              <span className="font-semibold text-[var(--ink)]">{key}:</span> {formatMetadataValue(value)}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
