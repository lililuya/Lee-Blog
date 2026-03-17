import Link from "next/link";
import {
  changeUserRoleAction,
  deleteUserAction,
  muteUserAction,
  restoreUserAction,
  revokeUserSessionsAction,
  suspendUserAction,
  unmuteUserAction,
} from "@/lib/actions/user-actions";
import { requireAdmin } from "@/lib/auth";
import { userManagementErrorMap, userManagementNoticeMap } from "@/lib/admin-user-management";
import { getAdminUsers } from "@/lib/queries";
import { formatUserRole, formatUserStatus, isUserMuted } from "@/lib/user-state";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const currentUser = await requireAdmin();
  const params = await searchParams;
  const users = await getAdminUsers();

  const activeUsers = users.filter((user) => user.status === "ACTIVE");
  const mutedUsers = users.filter((user) => user.status === "ACTIVE" && isUserMuted(user.mutedUntil));
  const deletedUsers = users.filter((user) => user.status === "DELETED");
  const adminUsers = users.filter((user) => user.role === "ADMIN" && user.status !== "DELETED");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="section-kicker">Users</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">User Management</h1>
        <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
          Manage role changes, comment mute windows, sign-in suspension, soft deletion, and session revocation here.
          Every privileged action is now written into the admin audit log for later review.
        </p>
      </div>

      {params.notice && userManagementNoticeMap[params.notice] ? (
        <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          {userManagementNoticeMap[params.notice]}
        </div>
      ) : null}

      {params.error && userManagementErrorMap[params.error] ? (
        <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          {userManagementErrorMap[params.error]}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Active Users</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{activeUsers.length}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Admins</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{adminUsers.length}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Muted</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{mutedUsers.length}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Deleted</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{deletedUsers.length}</p>
        </div>
      </div>

      <div className="space-y-5">
        {users.map((user) => {
          const isSelf = user.id === currentUser.id;
          const muted = isUserMuted(user.mutedUntil);

          return (
            <article key={user.id} className="glass-card rounded-[2rem] p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:justify-between">
                <div className="space-y-4 xl:max-w-2xl">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-2xl font-semibold tracking-tight">{user.name}</h2>
                      <span className="badge-soft">{formatUserRole(user.role)}</span>
                      <span className="badge-soft">{formatUserStatus(user.status)}</span>
                      {muted ? <span className="badge-soft bg-[rgba(168,123,53,0.1)] text-[var(--gold)]">Muted</span> : null}
                      {isSelf ? <span className="badge-soft">Current session</span> : null}
                    </div>
                    <p className="text-sm text-[var(--ink-soft)]">{user.email}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link href={`/admin/users/${user.id}`} className="btn-secondary">
                      Open detail
                    </Link>
                    {user._count.sessions > 0 ? (
                      <span className="text-sm leading-7 text-[var(--ink-soft)]">
                        {user._count.sessions} active session(s) can be revoked independently of account status.
                      </span>
                    ) : (
                      <span className="text-sm leading-7 text-[var(--ink-soft)]">No active sessions currently recorded.</span>
                    )}
                  </div>

                  {user.statusReason ? (
                    <div className="rounded-[1.4rem] bg-[rgba(20,33,43,0.03)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                      Status reason: {user.statusReason}
                    </div>
                  ) : null}

                  {muted ? (
                    <div className="rounded-[1.4rem] bg-[rgba(168,123,53,0.08)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                      Muted until: {formatDate(user.mutedUntil, "yyyy-MM-dd HH:mm")}
                      {user.muteReason ? ` | Reason: ${user.muteReason}` : ""}
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">Posts</div>
                      <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">{user._count.posts}</div>
                    </div>
                    <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">Comments</div>
                      <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">{user._count.comments}</div>
                    </div>
                    <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">Active Sessions</div>
                      <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">{user._count.sessions}</div>
                    </div>
                    <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                      <div>Created: {formatDate(user.createdAt, "yyyy-MM-dd HH:mm")}</div>
                      <div>Last login: {user.lastLoginAt ? formatDate(user.lastLoginAt, "yyyy-MM-dd HH:mm") : "Never"}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 xl:w-[28rem]">
                  <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                    <h3 className="font-semibold text-[var(--ink)]">Role Controls</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {user.status !== "DELETED" && user.role === "READER" ? (
                        <form
                          action={changeUserRoleAction}
                          data-confirm-message={`Promote ${user.name} to admin? This grants full admin console access.`}
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="role" value="ADMIN" />
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
                          <button type="submit" className="btn-secondary">Downgrade to reader</button>
                        </form>
                      ) : null}
                      {isSelf ? <span className="text-sm text-[var(--ink-soft)]">You cannot change your own role.</span> : null}
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
                            <button type="submit" className="btn-secondary">Remove mute</button>
                          </form>
                        ) : null}
                      </>
                    ) : muted ? (
                      <form
                        action={unmuteUserAction}
                        className="mt-3"
                        data-confirm-message={`Remove the current mute for ${user.name}?`}
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" className="btn-secondary">Remove mute</button>
                      </form>
                    ) : isSelf ? (
                      <p className="mt-3 text-sm text-[var(--ink-soft)]">Your current account cannot mute itself.</p>
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
                          <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                            <span>Delete reason</span>
                            <input name="reason" className="field" placeholder="Soft delete while keeping references for audit" />
                          </label>
                          <button type="submit" className="btn-secondary text-rose-700">Soft delete user</button>
                        </form>
                      </>
                    ) : null}

                    {user.status !== "ACTIVE" ? (
                      <form
                        action={restoreUserAction}
                        className="mt-3"
                        data-confirm-message={`Restore ${user.name}? This will re-enable the account and allow access again.`}
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" className="btn-secondary">Restore account</button>
                      </form>
                    ) : null}

                    {isSelf ? (
                      <p className="mt-3 text-sm text-[var(--ink-soft)]">You cannot suspend or delete your own account.</p>
                    ) : null}
                  </section>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
