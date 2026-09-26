import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  BarChart3,
  Ban,
  Check,
  Flag,
  Loader2,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function LockedAdmin({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const unlock = trpc.admin.unlock.useMutation({
    onSuccess: () => {
      toast.success("Admin access granted");
      onUnlocked();
    },
    onError: e => toast.error(e.message),
  });
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6 page-grid">
      <div className="w-full max-w-md rounded-[2rem] border bg-card p-7 text-center soft-shadow">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary">
          <LockKeyhole size={30} />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-primary">
          Protected control room
        </p>
        <h1 className="mt-2 font-[Manrope] text-3xl font-extrabold">
          Admin password
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Enter the primary administrator password to open the dashboard. Direct
          links do not bypass this check.
        </p>
        <Input
          autoFocus
          type="password"
          className="mt-6 h-12 rounded-xl"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") unlock.mutate({ password });
          }}
        />
        <Button
          className="mt-3 h-12 w-full rounded-xl font-bold"
          disabled={unlock.isPending || !password}
          onClick={() => unlock.mutate({ password })}
        >
          {unlock.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <LockKeyhole size={17} /> Open admin dashboard
            </>
          )}
        </Button>
        <button
          className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          <ArrowLeft size={15} /> Return to Gridora
        </button>
      </div>
    </div>
  );
}
function Dashboard() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryOffset, setDirectoryOffset] = useState(0);
  const [moderationReason, setModerationReason] = useState("");
  const stats = trpc.admin.stats.useQuery();
  const users = trpc.admin.users.useQuery({ search });
  const directory = trpc.admin.userDirectory.useQuery({
    search: directorySearch,
    offset: directoryOffset,
    limit: 25,
  });
  const reports = trpc.admin.reports.useQuery();
  const challenges = trpc.admin.challenges.useQuery();
  const admins = trpc.admin.listAdmins.useQuery();
  const [challenge, setChallenge] = useState({
    title: "",
    description: "",
    deadline: "",
  });
  const createChallenge = trpc.admin.createChallenge.useMutation({
    onSuccess: () => {
      toast.success("Challenge submitted for approval");
      setChallenge({ title: "", description: "", deadline: "" });
      challenges.refetch();
      stats.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const resolve = trpc.admin.resolveReport.useMutation({
    onSuccess: () => reports.refetch(),
    onError: e => toast.error(e.message),
  });
  const accountStatus = trpc.admin.setAccountStatus.useMutation({
    onSuccess: result => {
      toast.success(
        result.status === "deleted"
          ? "Account marked deleted; user data retained"
          : result.status === "suspended"
            ? "Account suspended and sessions revoked"
            : "Account access restored"
      );
      directory.refetch();
      users.refetch();
      stats.refetch();
      reports.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const approveChallenge = trpc.admin.approveChallenge.useMutation({
    onSuccess: () => {
      toast.success("Challenge approved");
      challenges.refetch();
      stats.refetch();
    },
  });
  const denyChallenge = trpc.admin.denyChallenge.useMutation({
    onSuccess: () => {
      toast.success("Challenge denied");
      challenges.refetch();
      stats.refetch();
    },
  });
  const deleteChallenge = trpc.admin.deleteChallenge.useMutation({
    onSuccess: () => challenges.refetch(),
  });
  const grantAdmin = trpc.admin.grantAdmin.useMutation({
    onSuccess: () => {
      toast.success("Second admin approved");
      users.refetch();
      admins.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const revokeAdmin = trpc.admin.revokeAdmin.useMutation({
    onSuccess: () => {
      toast.success("Admin access revoked");
      admins.refetch();
      users.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const content = trpc.admin.content.list.useQuery();
  const saveContent = trpc.admin.content.save.useMutation({
    onSuccess: () => {
      toast.success("Content saved");
      content.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const [contentDraft, setContentDraft] = useState<Record<string, string>>({});
  const [brandingDataUrl, setBrandingDataUrl] = useState("");
  const [faviconDataUrl, setFaviconDataUrl] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementImage, setAnnouncementImage] = useState("");
  const [announcementUserId, setAnnouncementUserId] = useState("");
  const [announcementAllUsers, setAnnouncementAllUsers] = useState(true);
  const [announcementTargetType, setAnnouncementTargetType] = useState("");
  const [announcementTargetId, setAnnouncementTargetId] = useState("");
  const announcement = trpc.admin.announcement.useMutation({
    onSuccess: result => {
      toast.success(`Announcement sent to ${result.count} user(s)`);
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementImage("");
    },
    onError: e => toast.error(e.message),
  });
  const removeContent = trpc.admin.content.remove.useMutation({
    onSuccess: () => {
      toast.success("Branding asset removed");
      content.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const message = trpc.admin.message.useMutation({
    onSuccess: data => {
      toast.success("Message sent");
      setAdminMessage("");
    },
    onError: e => toast.error(e.message),
  });
  const [messageTarget, setMessageTarget] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const getContent = (key: string, fallback: string) =>
    contentDraft[key] ??
    content.data?.find(item => item.key === key)?.value ??
    fallback;
  return (
    <div className="min-h-screen bg-background page-grid">
      <header className="border-b bg-card/80">
        <div className="container flex h-16 items-center gap-3">
          <button
            className="rounded-xl p-2 hover:bg-muted"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">
              Gridora control room
            </p>
            <h1 className="font-[Manrope] text-xl font-extrabold">
              Admin dashboard
            </h1>
          </div>
          <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
            Verified session
          </span>
        </div>
      </header>
      <main className="container py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Users", value: stats.data?.users, icon: Users },
            { label: "Posts", value: stats.data?.posts, icon: BarChart3 },
            { label: "Open reports", value: stats.data?.reports, icon: Flag },
            {
              label: "Pending challenges",
              value: stats.data?.challenges,
              icon: ShieldCheck,
            },
          ].map(card => (
            <div key={card.label} className="rounded-3xl border bg-card p-5">
              <card.icon className="text-primary" size={19} />
              <p className="mt-5 text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 font-[Manrope] text-3xl font-extrabold">
                {card.value ?? "—"}
              </p>
            </div>
          ))}
        </div>
        <section className="mt-6 rounded-3xl border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-[Manrope] text-xl font-extrabold">
                All user accounts
              </h2>
              <p className="text-sm text-muted-foreground">
                {directory.data?.total ?? "—"} accounts · account data is
                retained if access is disabled
              </p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="pl-9"
                value={directorySearch}
                onChange={event => {
                  setDirectorySearch(event.target.value);
                  setDirectoryOffset(0);
                }}
                placeholder="Search name, username, phone, or email"
                aria-label="Search all accounts"
              />
            </div>
          </div>
          <div className="mb-4 max-w-xl">
            <label
              className="mb-1 block text-xs font-semibold text-muted-foreground"
              htmlFor="moderation-note"
            >
              Optional reason for the next moderation action
            </label>
            <Input
              id="moderation-note"
              value={moderationReason}
              onChange={event =>
                setModerationReason(event.target.value.slice(0, 500))
              }
              placeholder="Internal moderation note"
              maxLength={500}
            />
          </div>
          {directory.isLoading ? (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              Loading all user accounts…
            </p>
          ) : directory.error ? (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
            >
              Could not load the user directory. Refresh and try again.
            </p>
          ) : directory.data?.rows.length ? (
            <div className="space-y-2">
              {directory.data.rows.map(account => {
                const isSelf = account.id === currentUser?.id;
                const isAdmin = account.role === "admin";
                const statusPending = accountStatus.isPending;
                return (
                  <div
                    key={account.id}
                    className="flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">
                          {account.name || "Unnamed account"}
                        </p>
                        <span className="text-sm text-muted-foreground">
                          @{account.username || "no-username"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${account.moderationStatus === "active" ? "bg-emerald-500/10 text-emerald-600" : account.moderationStatus === "suspended" ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive"}`}
                        >
                          {account.moderationStatus}
                        </span>
                        {isAdmin && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-secondary-foreground">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {account.email || account.phone || "No contact details"}{" "}
                        · {account.accountType} · joined{" "}
                        {new Date(account.createdAt).toLocaleDateString()}
                      </p>
                      {account.moderationReason &&
                        account.moderationStatus !== "active" && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Moderation reason: {account.moderationReason}
                          </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {account.moderationStatus !== "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={statusPending || isSelf}
                          onClick={() =>
                            accountStatus.mutate({
                              userId: account.id,
                              status: "active",
                            })
                          }
                        >
                          Restore access
                        </Button>
                      )}
                      {account.moderationStatus === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={statusPending || isSelf}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Suspend ${account.name || `account #${account.id}`} and revoke active sessions? An admin can restore access later.`
                              )
                            )
                              accountStatus.mutate({
                                userId: account.id,
                                status: "suspended",
                                reason: moderationReason,
                              });
                          }}
                        >
                          <Ban size={14} /> Suspend
                        </Button>
                      )}
                      {account.moderationStatus !== "deleted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-destructive"
                          disabled={statusPending || isSelf}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Mark ${account.name || `account #${account.id}`} as deleted? Their sign-in will be disabled and active sessions revoked. Existing account data is retained and an admin can restore access.`
                              )
                            )
                              accountStatus.mutate({
                                userId: account.id,
                                status: "deleted",
                                reason:
                                  moderationReason ||
                                  "Deleted by administrator",
                              });
                          }}
                        >
                          <Trash2 size={14} /> Delete account
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              No accounts match this search.
            </p>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {directory.data?.total
                ? `${directoryOffset + 1}–${Math.min(directoryOffset + 25, directory.data.total)} of ${directory.data.total}`
                : "0 accounts"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={directoryOffset === 0 || directory.isFetching}
                onClick={() =>
                  setDirectoryOffset(offset => Math.max(0, offset - 25))
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={
                  directoryOffset + 25 >= (directory.data?.total ?? 0) ||
                  directory.isFetching
                }
                onClick={() => setDirectoryOffset(offset => offset + 25)}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
        <section className="mt-6 rounded-3xl border bg-card p-5">
          <div className="mb-4">
            <h2 className="font-[Manrope] text-xl font-extrabold">
              Website content
            </h2>
            <p className="text-sm text-muted-foreground">
              Edit public copy without touching technical secrets.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Homepage tagline
              </label>
              <Textarea
                value={getContent(
                  "home.tagline",
                  "Your next creative connection starts here."
                )}
                onChange={e =>
                  setContentDraft({
                    ...contentDraft,
                    "home.tagline": e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            {[
              [
                "home.kicker",
                "Homepage eyebrow",
                "Built for people who make things",
              ],
              ["home.titleStart", "Hero title — first part", "Your next"],
              [
                "home.titleAccent",
                "Hero title — accent part",
                "creative connection",
              ],
              ["home.titleEnd", "Hero title — final part", "starts here."],
            ].map(([key, label, fallback]) => (
              <div key={key}>
                <label className="text-xs font-bold text-muted-foreground">
                  {label}
                </label>
                <Input
                  value={getContent(key, fallback)}
                  onChange={e =>
                    setContentDraft({ ...contentDraft, [key]: e.target.value })
                  }
                  className="mt-1"
                  maxLength={160}
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                About content
              </label>
              <Textarea
                value={getContent(
                  "legal.about",
                  "Gridora connects clients with designers for thoughtful, professional creative work."
                )}
                onChange={e =>
                  setContentDraft({
                    ...contentDraft,
                    "legal.about": e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Privacy policy
              </label>
              <Textarea
                value={getContent(
                  "legal.privacy",
                  "Gridora stores account, profile, message, notification, and uploaded-file data needed to provide the platform."
                )}
                onChange={e =>
                  setContentDraft({
                    ...contentDraft,
                    "legal.privacy": e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Terms of service
              </label>
              <Textarea
                value={getContent(
                  "legal.terms",
                  "Use Gridora lawfully and respectfully. Keep your account secure and respect other users."
                )}
                onChange={e =>
                  setContentDraft({
                    ...contentDraft,
                    "legal.terms": e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Cookie policy
              </label>
              <Textarea
                value={getContent(
                  "legal.cookies",
                  "Gridora uses necessary session cookies for authentication and secure access, plus local preferences for the application experience."
                )}
                onChange={e =>
                  setContentDraft({
                    ...contentDraft,
                    "legal.cookies": e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["social.instagram", "Instagram URL"],
              ["social.facebook", "Facebook URL"],
              ["social.linkedin", "LinkedIn URL"],
              ["social.tiktok", "TikTok URL"],
              ["social.youtube", "YouTube URL"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-bold text-muted-foreground">
                  {label}
                </label>
                <Input
                  value={getContent(key, "")}
                  onChange={e =>
                    setContentDraft({ ...contentDraft, [key]: e.target.value })
                  }
                  className="mt-1"
                  type="url"
                  placeholder="https://…"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-muted px-3 py-2 text-sm font-semibold">
              <span>Upload branding logo</span>
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024)
                    return toast.error("Logo must be 5MB or smaller");
                  const r = new FileReader();
                  r.onload = () => setBrandingDataUrl(String(r.result));
                  r.readAsDataURL(file);
                }}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-muted px-3 py-2 text-sm font-semibold">
              <span>Upload favicon</span>
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024)
                    return toast.error("Favicon must be 2MB or smaller");
                  const r = new FileReader();
                  r.onload = () => setFaviconDataUrl(String(r.result));
                  r.readAsDataURL(file);
                }}
              />
            </label>
            {brandingDataUrl && (
              <img
                src={brandingDataUrl}
                alt="Logo preview"
                className="h-10 w-10 rounded-lg object-cover"
              />
            )}
            <Button
              className="rounded-xl"
              onClick={() => {
                Object.entries(contentDraft).forEach(([key, value]) =>
                  saveContent.mutate({ key, value })
                );
                if (brandingDataUrl)
                  saveContent.mutate({
                    key: "branding.logo",
                    imageDataUrl: brandingDataUrl,
                  });
                if (faviconDataUrl)
                  saveContent.mutate({
                    key: "branding.favicon",
                    imageDataUrl: faviconDataUrl,
                  });
              }}
              disabled={saveContent.isPending}
            >
              Save content changes
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => removeContent.mutate({ key: "branding.logo" })}
              disabled={removeContent.isPending}
            >
              <Trash2 size={16} /> Remove logo
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => removeContent.mutate({ key: "branding.favicon" })}
              disabled={removeContent.isPending}
            >
              <Trash2 size={16} /> Remove favicon
            </Button>
            <span className="self-center text-xs text-muted-foreground">
              Each field is stored in the protected database.
            </span>
          </div>
        </section>
        <section className="mt-6 rounded-3xl border bg-card p-5">
          <div className="mb-4">
            <h2 className="font-[Manrope] text-xl font-extrabold">
              Website announcements
            </h2>
            <p className="text-sm text-muted-foreground">
              Create live notifications for all users or one account.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={announcementTitle}
              onChange={e => setAnnouncementTitle(e.target.value)}
              placeholder="Notification title"
            />
            <select
              className="h-10 rounded-xl border bg-background px-3 text-sm"
              value={announcementAllUsers ? "all" : announcementUserId}
              onChange={e => {
                setAnnouncementAllUsers(e.target.value === "all");
                setAnnouncementUserId(
                  e.target.value === "all" ? "" : e.target.value
                );
              }}
            >
              <option value="all">All registered users</option>
              {users.data?.map(account => (
                <option key={account.id} value={String(account.id)}>
                  {account.name} (@{account.username})
                </option>
              ))}
            </select>
            <Textarea
              className="sm:col-span-2"
              value={announcementBody}
              onChange={e => setAnnouncementBody(e.target.value)}
              placeholder="Announcement message"
            />
            <Input
              value={announcementTargetType}
              onChange={e => setAnnouncementTargetType(e.target.value)}
              placeholder="Destination type (profile, chat, project)"
            />
            <Input
              inputMode="numeric"
              value={announcementTargetId}
              onChange={e =>
                setAnnouncementTargetId(e.target.value.replace(/\D/g, ""))
              }
              placeholder="Destination ID (optional)"
            />
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-muted px-3 py-2 text-sm font-semibold">
              <span>{announcementImage ? "Image selected" : "Add image"}</span>
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024)
                    return toast.error("Image must be 5MB or smaller");
                  const reader = new FileReader();
                  reader.onload = () =>
                    setAnnouncementImage(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <Button
              className="rounded-xl"
              disabled={
                !announcementTitle.trim() ||
                !announcementBody.trim() ||
                announcement.isPending ||
                (!announcementAllUsers && !announcementUserId)
              }
              onClick={() =>
                announcement.mutate({
                  title: announcementTitle,
                  body: announcementBody,
                  imageDataUrl: announcementImage || undefined,
                  allUsers: announcementAllUsers,
                  userIds: announcementAllUsers
                    ? undefined
                    : [Number(announcementUserId)],
                  targetType: announcementTargetType || undefined,
                  targetId: announcementTargetId
                    ? Number(announcementTargetId)
                    : undefined,
                })
              }
            >
              Send announcement
            </Button>
          </div>
        </section>
        <section className="mt-6 rounded-3xl border bg-card p-5">
          <div className="mb-4">
            <h2 className="font-[Manrope] text-xl font-extrabold">
              Message a user
            </h2>
            <p className="text-sm text-muted-foreground">
              One-way admin announcements. The recipient cannot reply to this
              admin thread.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
            <select
              className="h-10 rounded-xl border bg-background px-3 text-sm"
              value={messageTarget}
              onChange={e => setMessageTarget(e.target.value)}
            >
              <option value="">Select a registered user</option>
              {users.data?.map(account => (
                <option key={account.id} value={String(account.id)}>
                  {account.name} (@{account.username})
                </option>
              ))}
            </select>
            <Input
              value={adminMessage}
              onChange={e => setAdminMessage(e.target.value)}
              placeholder="Announcement message"
            />
            <Button
              className="rounded-xl"
              disabled={
                !messageTarget || !adminMessage.trim() || message.isPending
              }
              onClick={() =>
                message.mutate({
                  userId: Number(messageTarget),
                  body: adminMessage,
                })
              }
            >
              Send
            </Button>
          </div>
        </section>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-[Manrope] text-xl font-extrabold">
                  Reported users and content
                </h2>
                <p className="text-sm text-muted-foreground">
                  Resolve or dismiss reports quickly.
                </p>
              </div>
              <Flag className="text-primary" size={20} />
            </div>
            <div className="space-y-3">
              {reports.data?.length ? (
                reports.data.map(report => (
                  <div key={report.id} className="rounded-2xl border p-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary">
                        <UserRound size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">
                          {report.targetType === "user"
                            ? report.targetUser?.name ||
                              `User #${report.targetId}`
                            : `${report.targetType} #${report.targetId}`}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {report.reason}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Reported by{" "}
                          {report.reporter?.name ||
                            `user #${report.reporterId}`}
                          {report.reporter?.username
                            ? ` (@${report.reporter.username})`
                            : ""}
                        </p>
                        {report.reporterBlockedTarget && (
                          <span className="mt-2 inline-flex rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">
                            Reporter has blocked this user
                          </span>
                        )}
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                          {report.status}
                        </p>
                      </div>
                    </div>
                    {report.status === "open" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() =>
                            resolve.mutate({
                              id: report.id,
                              status: "resolved",
                            })
                          }
                        >
                          <Check size={14} /> Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() =>
                            resolve.mutate({
                              id: report.id,
                              status: "reviewed",
                            })
                          }
                        >
                          <X size={14} /> Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
                  No open reports. The queue is clear.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-3xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-[Manrope] text-xl font-extrabold">
                  Challenge approvals
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pending briefs stay private until approved.
                </p>
              </div>
              <ShieldCheck className="text-primary" size={20} />
            </div>
            <div className="space-y-3">
              {challenges.data?.length ? (
                challenges.data.map(item => (
                  <div key={item.id} className="rounded-2xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {item.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase">
                        {item.status}
                      </span>
                    </div>
                    {item.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() =>
                            approveChallenge.mutate({ id: item.id })
                          }
                        >
                          <Check size={14} /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => denyChallenge.mutate({ id: item.id })}
                        >
                          <X size={14} /> Deny
                        </Button>
                      </div>
                    )}
                    {item.status === "denied" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 rounded-xl text-destructive"
                        onClick={() => deleteChallenge.mutate({ id: item.id })}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
                  No challenge submissions are waiting.
                </p>
              )}
            </div>
          </section>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="text-primary" size={19} />
              <div>
                <h2 className="font-[Manrope] text-xl font-extrabold">
                  Create challenge
                </h2>
                <p className="text-sm text-muted-foreground">
                  New challenges enter the pending queue.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Input
                value={challenge.title}
                onChange={e =>
                  setChallenge({ ...challenge, title: e.target.value })
                }
                placeholder="Challenge title"
              />
              <Textarea
                value={challenge.description}
                onChange={e =>
                  setChallenge({ ...challenge, description: e.target.value })
                }
                placeholder="Brief and judging criteria"
              />
              <Input
                type="date"
                value={challenge.deadline}
                onChange={e =>
                  setChallenge({ ...challenge, deadline: e.target.value })
                }
              />
              <Button
                className="rounded-xl"
                onClick={() => createChallenge.mutate(challenge)}
              >
                Submit challenge
              </Button>
            </div>
          </section>
        </div>
        <section className="mt-6 rounded-3xl border bg-card p-5">
          <div className="mb-4">
            <h2 className="font-[Manrope] text-xl font-extrabold">
              Admin access control
            </h2>
            <p className="text-sm text-muted-foreground">
              The control room is password-gated. Manage delegated administrator
              roles here.
            </p>
          </div>
          <div className="space-y-3">
            {admins.data?.map(entry => (
              <div
                key={entry.admin.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/60 p-3"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-xs font-bold text-white">
                  {(entry.user.name || "A").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {entry.user.name}{" "}
                    {entry.admin.isPrimary && (
                      <span className="text-primary">· Primary</span>
                    )}
                  </p>
                </div>
                {entry.user.id !== currentUser?.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-destructive"
                    onClick={() =>
                      revokeAdmin.mutate({ userId: entry.user.id })
                    }
                  >
                    Revoke admin
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6 rounded-3xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-[Manrope] text-xl font-extrabold">Users</h2>
              <p className="text-sm text-muted-foreground">
                Search accounts and approve delegated admins.
              </p>
            </div>
            <Input
              className="w-44"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
            />
          </div>
          <div className="space-y-2">
            {users.data?.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-xs font-bold text-white">
                  {(item.name || "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{item.username} · {item.phone}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold">
                  {item.role}
                </span>
                {item.role !== "admin" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-[10px]"
                    onClick={() => grantAdmin.mutate({ userId: item.id })}
                  >
                    Approve admin
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  if (!user || user.role !== "admin")
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md rounded-3xl border bg-card p-8 text-center">
          <ShieldCheck className="mx-auto mb-3 text-primary" size={34} />
          <h1 className="font-[Manrope] text-2xl font-extrabold">
            Admin account required
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This route is protected by the account role and then requires a
            password password verification.
          </p>
          <Button
            className="mt-5 rounded-xl"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Return to Gridora
          </Button>
        </div>
      </div>
    );
  return unlocked ? (
    <Dashboard />
  ) : (
    <LockedAdmin onUnlocked={() => setUnlocked(true)} />
  );
}
