import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Flag,
  Loader2,
  LockKeyhole,
  Plus,
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
  const stats = trpc.admin.stats.useQuery();
  const users = trpc.admin.users.useQuery({ search });
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
