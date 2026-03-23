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
        <p className="section-kicker">用户</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">用户管理</h1>
        <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
          在这里管理角色变更、评论禁言时段、登录暂停、软删除以及会话撤销。所有高权限操作都会同步写入后台审计日志，便于后续追踪。
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">正常用户</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{activeUsers.length}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">管理员</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{adminUsers.length}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">评论禁言</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{mutedUsers.length}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">已删除</p>
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
                      {muted ? <span className="badge-soft bg-[rgba(168,123,53,0.1)] text-[var(--gold)]">评论禁言</span> : null}
                      {isSelf ? <span className="badge-soft">当前账号</span> : null}
                    </div>
                    <p className="text-sm text-[var(--ink-soft)]">{user.email}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link href={`/admin/users/${user.id}`} className="btn-secondary">
                      查看详情
                    </Link>
                    {user._count.sessions > 0 ? (
                      <span className="text-sm leading-7 text-[var(--ink-soft)]">
                        当前有 {user._count.sessions} 个活动会话，可独立于账号状态单独撤销。
                      </span>
                    ) : (
                      <span className="text-sm leading-7 text-[var(--ink-soft)]">当前没有记录到活动会话。</span>
                    )}
                  </div>

                  {user.statusReason ? (
                    <div className="rounded-[1.4rem] bg-[rgba(20,33,43,0.03)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                      状态原因：{user.statusReason}
                    </div>
                  ) : null}

                  {muted ? (
                    <div className="rounded-[1.4rem] bg-[rgba(168,123,53,0.08)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                      禁言至：{formatDate(user.mutedUntil, "yyyy-MM-dd HH:mm")}
                      {user.muteReason ? ` | 原因：${user.muteReason}` : ""}
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">文章</div>
                      <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">{user._count.posts}</div>
                    </div>
                    <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">评论</div>
                      <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">{user._count.comments}</div>
                    </div>
                    <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">活动会话</div>
                      <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">{user._count.sessions}</div>
                    </div>
                    <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                      <div>创建于：{formatDate(user.createdAt, "yyyy-MM-dd HH:mm")}</div>
                      <div>最近登录：{user.lastLoginAt ? formatDate(user.lastLoginAt, "yyyy-MM-dd HH:mm") : "从未"}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 xl:w-[28rem]">
                  <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                    <h3 className="font-semibold text-[var(--ink)]">角色控制</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {user.status !== "DELETED" && user.role === "READER" ? (
                        <form
                          action={changeUserRoleAction}
                          data-confirm-message={`将 ${user.name} 提升为管理员吗？这会授予完整的后台访问权限。`}
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="role" value="ADMIN" />
                          <button type="submit" className="btn-secondary">提升为管理员</button>
                        </form>
                      ) : null}
                      {user.status !== "DELETED" && user.role === "ADMIN" && !isSelf ? (
                        <form
                          action={changeUserRoleAction}
                          data-confirm-message={`将 ${user.name} 降级为读者吗？这会移除后台访问权限。`}
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="role" value="READER" />
                          <button type="submit" className="btn-secondary">降级为读者</button>
                        </form>
                      ) : null}
                      {isSelf ? <span className="text-sm text-[var(--ink-soft)]">不能修改你自己的角色。</span> : null}
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                    <h3 className="font-semibold text-[var(--ink)]">评论控制</h3>
                    {user.status === "ACTIVE" && !isSelf ? (
                      <>
                        <form
                          action={muteUserAction}
                          className="mt-3 space-y-3"
                          data-confirm-message={`对 ${user.name} 启用评论禁言吗？请确认禁言时长和原因填写正确。`}
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <div className="grid gap-3 md:grid-cols-[7rem_1fr]">
                            <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                              <span>禁言天数</span>
                              <input name="days" type="number" min={1} max={365} defaultValue={7} className="field" />
                            </label>
                            <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                              <span>原因</span>
                              <input name="reason" className="field" placeholder="垃圾评论、辱骂、低质量灌水等" />
                            </label>
                          </div>
                          <button type="submit" className="btn-secondary">应用禁言</button>
                        </form>
                        {muted ? (
                          <form
                            action={unmuteUserAction}
                            className="mt-3"
                            data-confirm-message={`解除 ${user.name} 当前的评论禁言吗？`}
                          >
                            <input type="hidden" name="userId" value={user.id} />
                            <button type="submit" className="btn-secondary">解除禁言</button>
                          </form>
                        ) : null}
                      </>
                    ) : muted ? (
                      <form
                        action={unmuteUserAction}
                        className="mt-3"
                        data-confirm-message={`解除 ${user.name} 当前的评论禁言吗？`}
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" className="btn-secondary">解除禁言</button>
                      </form>
                    ) : isSelf ? (
                      <p className="mt-3 text-sm text-[var(--ink-soft)]">当前账号不能对自己执行评论禁言。</p>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--ink-soft)]">只有正常状态的账号才能被评论禁言。</p>
                    )}
                  </section>

                  <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                    <h3 className="font-semibold text-[var(--ink)]">会话控制</h3>
                    {!isSelf ? (
                      <form
                        action={revokeUserSessionsAction}
                        className="mt-3 space-y-3"
                        data-confirm-message={`撤销 ${user.name} 的全部活动会话吗？对方需要在所有设备上重新登录。`}
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                          <span>原因</span>
                          <input name="reason" className="field" placeholder="安全轮换、清理设备、疑似被盗用等" />
                        </label>
                        <button type="submit" className="btn-secondary">撤销全部会话</button>
                      </form>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--ink-soft)]">不能在这里撤销当前管理员自己的会话。</p>
                    )}
                  </section>

                  <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                    <h3 className="font-semibold text-[var(--ink)]">账号状态</h3>
                    {user.status === "ACTIVE" && !isSelf ? (
                      <>
                        <form
                          action={suspendUserAction}
                          className="mt-3 space-y-3"
                          data-confirm-message={`暂停 ${user.name} 的登录权限吗？在恢复之前，对方将无法再次登录。`}
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                            <span>暂停原因</span>
                            <input name="reason" className="field" placeholder="滥用、账号被盗、违反站点规则等" />
                          </label>
                          <button type="submit" className="btn-secondary">暂停登录</button>
                        </form>
                        <form
                          action={deleteUserAction}
                          className="mt-3 space-y-3"
                          data-confirm-message={`软删除 ${user.name} 吗？账号会被隐藏，登录会被禁用，直到你手动恢复。`}
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                            <span>删除原因</span>
                            <input name="reason" className="field" placeholder="软删除账号，但保留审计关联关系" />
                          </label>
                          <button type="submit" className="btn-secondary text-rose-700">软删除用户</button>
                        </form>
                      </>
                    ) : null}

                    {user.status !== "ACTIVE" ? (
                      <form
                        action={restoreUserAction}
                        className="mt-3"
                        data-confirm-message={`恢复 ${user.name} 的账号吗？恢复后对方将重新获得访问权限。`}
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" className="btn-secondary">恢复账号</button>
                      </form>
                    ) : null}

                    {isSelf ? (
                      <p className="mt-3 text-sm text-[var(--ink-soft)]">不能暂停或删除你自己的账号。</p>
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
