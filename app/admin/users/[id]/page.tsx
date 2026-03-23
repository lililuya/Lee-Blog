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
import {
  formatAdminAuditAction,
  formatAdminAuditMetadataKey,
  formatAdminAuditMetadataValue,
} from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { getAdminUserById } from "@/lib/queries";
import {
  formatCommentStatusLabel,
  formatPostStatusLabel,
  formatSessionValidityLabel,
} from "@/lib/ui-labels";
import { formatUserRole, formatUserStatus, isUserMuted } from "@/lib/user-state";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
          返回用户管理
        </Link>
        <div className="space-y-3">
          <p className="section-kicker">用户详情</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-4xl font-semibold tracking-tight">{user.name}</h1>
            <span className="badge-soft">{formatUserRole(user.role)}</span>
            <span className="badge-soft">{formatUserStatus(user.status)}</span>
            {muted ? <span className="badge-soft bg-[rgba(168,123,53,0.1)] text-[var(--gold)]">评论禁言</span> : null}
            {isSelf ? <span className="badge-soft">当前账号</span> : null}
          </div>
          <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            在这里查看这个用户最近的会话、内容发布情况、评论活动，以及与其相关的完整后台审计轨迹。
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">文章</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{user._count.posts}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">评论</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{user._count.comments}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">会话</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{user._count.sessions}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">被审计记录</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{user._count.auditLogsTargeted}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">执行后台操作</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{user._count.auditLogsAuthored}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">账号快照</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                <div>创建于：{formatDate(user.createdAt, "yyyy-MM-dd HH:mm")}</div>
                <div>更新于：{formatDate(user.updatedAt, "yyyy-MM-dd HH:mm")}</div>
                <div>最近登录：{user.lastLoginAt ? formatDate(user.lastLoginAt, "yyyy-MM-dd HH:mm") : "从未"}</div>
                <div>删除时间：{user.deletedAt ? formatDate(user.deletedAt, "yyyy-MM-dd HH:mm") : "未删除"}</div>
              </div>
              <div className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                <div>状态：{formatUserStatus(user.status)}</div>
                <div>角色：{formatUserRole(user.role)}</div>
                <div>当前禁言：{muted ? formatDate(user.mutedUntil, "yyyy-MM-dd HH:mm") : "未禁言"}</div>
                <div>禁言原因：{user.muteReason ?? "无"}</div>
              </div>
            </div>
            {user.statusReason ? (
              <div className="mt-4 rounded-[1.4rem] bg-[rgba(20,33,43,0.03)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                状态原因：{user.statusReason}
              </div>
            ) : null}
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">会话</p>
                <h2 className="font-serif text-2xl font-semibold tracking-tight">最近会话</h2>
              </div>
              <span className="text-sm text-[var(--ink-soft)]">最近 {user.sessions.length} 条</span>
            </div>
            <div className="mt-5 space-y-3">
              {user.sessions.length ? (
                user.sessions.map((session) => (
                  <article key={session.id} className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 text-sm leading-7 text-[var(--ink-soft)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--ink)]">会话 {session.id.slice(0, 8)}</span>
                      <span className="badge-soft">{formatSessionValidityLabel(session.expiresAt > now)}</span>
                    </div>
                    <div className="mt-2">创建于：{formatDate(session.createdAt, "yyyy-MM-dd HH:mm")}</div>
                    <div>最近更新：{formatDate(session.updatedAt, "yyyy-MM-dd HH:mm")}</div>
                    <div>过期时间：{formatDate(session.expiresAt, "yyyy-MM-dd HH:mm")}</div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                  这个账号当前没有保存中的会话记录。
                </div>
              )}
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <div className="space-y-2">
              <p className="section-kicker">审计</p>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">与该用户相关的最近审计活动</h2>
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
                          <span>系统</span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{log.summary}</p>
                      {metadataEntries.length ? (
                        <div className="mt-4 grid gap-2 md:grid-cols-2">
                          {metadataEntries.map(([key, value]) => (
                            <div key={key} className="rounded-[1.2rem] bg-[rgba(20,33,43,0.03)] px-3 py-2 text-xs leading-6 text-[var(--ink-soft)]">
                              <span className="font-semibold text-[var(--ink)]">
                                {formatAdminAuditMetadataKey(key)}:
                              </span>{" "}
                              {formatAdminAuditMetadataValue(key, value)}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                  这个账号暂时还没有相关审计事件。
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">管理操作</h2>

            <div className="mt-5 space-y-4">
              <section className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
                <h3 className="font-semibold text-[var(--ink)]">角色控制</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.status !== "DELETED" && user.role === "READER" && !isSelf ? (
                    <form
                      action={changeUserRoleAction}
                      data-confirm-message={`将 ${user.name} 提升为管理员吗？这会授予完整的后台访问权限。`}
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="role" value="ADMIN" />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
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
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button type="submit" className="btn-secondary">降级为读者</button>
                    </form>
                  ) : null}
                  {isSelf ? <p className="text-sm text-[var(--ink-soft)]">不能修改你自己的角色。</p> : null}
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
                      <input type="hidden" name="redirectTo" value={redirectTo} />
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
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <button type="submit" className="btn-secondary">解除禁言</button>
                      </form>
                    ) : null}
                  </>
                ) : muted && !isSelf ? (
                  <form
                    action={unmuteUserAction}
                    className="mt-3"
                    data-confirm-message={`解除 ${user.name} 当前的评论禁言吗？`}
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <button type="submit" className="btn-secondary">解除禁言</button>
                  </form>
                ) : isSelf ? (
                  <p className="mt-3 text-sm text-[var(--ink-soft)]">当前管理员账号不能对自己执行评论禁言。</p>
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
                    <input type="hidden" name="redirectTo" value={redirectTo} />
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
                      <input type="hidden" name="redirectTo" value={redirectTo} />
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
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <label className="space-y-2 text-sm text-[var(--ink-soft)]">
                        <span>删除原因</span>
                        <input name="reason" className="field" placeholder="软删除账号，但保留审计关联关系" />
                      </label>
                      <button type="submit" className="btn-secondary text-rose-700">软删除用户</button>
                    </form>
                  </>
                ) : user.status !== "ACTIVE" ? (
                  <form
                    action={restoreUserAction}
                    className="mt-3"
                    data-confirm-message={`恢复 ${user.name} 的账号吗？恢复后对方将重新获得访问权限。`}
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <button type="submit" className="btn-secondary">恢复账号</button>
                  </form>
                ) : isSelf ? (
                  <p className="mt-3 text-sm text-[var(--ink-soft)]">不能暂停或删除你自己的账号。</p>
                ) : null}
              </section>
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <div className="space-y-2">
              <p className="section-kicker">内容</p>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">最近文章</h2>
            </div>
            <div className="mt-5 space-y-3">
              {user.posts.length ? (
                user.posts.map((post) => (
                  <article key={post.id} className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/admin/posts/${post.id}`} className="font-semibold text-[var(--ink)]">
                        {post.title}
                      </Link>
                      <span className="badge-soft">{formatPostStatusLabel(post.status)}</span>
                    </div>
                    <div className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                      更新时间：{formatDate(post.updatedAt, "yyyy-MM-dd HH:mm")}
                    </div>
                    <div className="text-sm leading-7 text-[var(--ink-soft)]">
                      发布时间：{post.publishedAt ? formatDate(post.publishedAt, "yyyy-MM-dd HH:mm") : "未发布"}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                  这个用户最近没有发布文章。
                </div>
              )}
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <div className="space-y-2">
              <p className="section-kicker">讨论</p>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">最近评论</h2>
            </div>
            <div className="mt-5 space-y-3">
              {user.comments.length ? (
                user.comments.map((comment) => (
                  <article key={comment.id} className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/blog/${comment.post.slug}`} className="font-semibold text-[var(--ink)]">
                        {comment.post.title}
                      </Link>
                      <span className="badge-soft">{formatCommentStatusLabel(comment.status)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{comment.content}</p>
                    <div className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                      创建于：{formatDate(comment.createdAt, "yyyy-MM-dd HH:mm")}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/60 px-4 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                  这个用户最近没有评论记录。
                </div>
              )}
            </div>
          </section>

          {user.auditLogsAuthored.length ? (
            <section className="glass-card rounded-[2rem] p-6">
              <div className="space-y-2">
                <p className="section-kicker">后台活动</p>
                <h2 className="font-serif text-2xl font-semibold tracking-tight">该用户最近执行的后台操作</h2>
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
                          <span>系统目标</span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{log.summary}</p>
                      {metadataEntries.length ? (
                        <div className="mt-4 grid gap-2">
                          {metadataEntries.map(([key, value]) => (
                            <div key={key} className="rounded-[1.2rem] bg-[rgba(20,33,43,0.03)] px-3 py-2 text-xs leading-6 text-[var(--ink-soft)]">
                              <span className="font-semibold text-[var(--ink)]">
                                {formatAdminAuditMetadataKey(key)}:
                              </span>{" "}
                              {formatAdminAuditMetadataValue(key, value)}
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
