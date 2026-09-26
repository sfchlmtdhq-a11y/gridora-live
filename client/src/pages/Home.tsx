import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { advanceAdminShortcutTap } from "@/lib/admin-shortcut";
import { shouldRenderPublicFooter } from "@/lib/public-footer";
import { Streamdown } from "streamdown";
import {
  getAuthErrorMessage,
  getAuthFieldFeedback,
  validateAuthForm,
  type AuthField,
} from "@/lib/auth-ui";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Bell,
  BriefcaseBusiness,
  Check,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Compass,
  FileText,
  FileImage,
  Hash,
  Heart,
  ImagePlus,
  Info,
  Loader2,
  LogOut,
  MessageCircle,
  Moon,
  Paperclip,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

type Tab = "chat" | "discover" | "settings" | "profile";
const initials = (name?: string | null) =>
  (name || "G")
    .split(" ")
    .map(s => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const avatarColors = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-400",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-600",
];
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function Brand({ compact = false }: { compact?: boolean }) {
  const branding = trpc.content.get.useQuery(
    { key: "branding.logo" },
    { staleTime: 0, refetchInterval: 10000 }
  );
  const favicon = trpc.content.get.useQuery(
    { key: "branding.favicon" },
    { staleTime: 0, refetchInterval: 10000 }
  );
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon.data?.value || "/favicon.ico";
  }, [favicon.data?.value]);
  return (
    <div className="flex items-center gap-2">
      {branding.data?.value ? (
        <img
          src={branding.data.value}
          alt="Gridora logo"
          className="h-9 w-9 rounded-xl object-cover"
        />
      ) : (
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Hash size={19} strokeWidth={3} />
        </div>
      )}
      {!compact && (
        <div>
          <div className="font-[Manrope] text-lg font-extrabold tracking-tight">
            gridora<span className="text-primary">.</span>
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">
            creative connections
          </div>
        </div>
      )}
    </div>
  );
}
function Avatar({
  name,
  avatarUrl,
  index = 0,
  size = "md",
  hasStatus = false,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  index?: number;
  size?: "sm" | "md" | "lg";
  hasStatus?: boolean;
}) {
  const sizes = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-16 w-16 text-lg",
  };
  return avatarUrl ? (
    <img
      src={avatarUrl}
      alt={name || "Profile"}
      className={`shrink-0 rounded-2xl object-cover ${sizes[size]} ring-4 ring-background ${hasStatus ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
    />
  ) : (
    <div
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${avatarColors[index % avatarColors.length]} ${sizes[size]} font-bold text-white ring-4 ring-background ${hasStatus ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
    >
      {initials(name)}
    </div>
  );
}
function PasswordEligibility({
  password,
  confirm,
}: {
  password: string;
  confirm?: string;
}) {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Contains a number", ok: /\d/.test(password) },
    { label: "Contains an uppercase letter", ok: /[A-Z]/.test(password) },
    ...(confirm !== undefined
      ? [
          {
            label: "Passwords match",
            ok: password.length > 0 && password === confirm,
          },
        ]
      : []),
  ];
  return (
    <div className="rounded-xl bg-muted/70 p-3 text-xs">
      <p className="mb-2 font-bold text-foreground">Password eligibility</p>
      <div className="grid gap-1 sm:grid-cols-2">
        {checks.map(check => (
          <div
            key={check.label}
            className={`flex items-center gap-2 ${check.ok ? "text-emerald-600" : "text-muted-foreground"}`}
          >
            <span
              className={`grid h-4 w-4 place-items-center rounded-full border text-[10px] ${check.ok ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"}`}
            >
              {check.ok && <Check size={11} />}
            </span>
            {check.label}
          </div>
        ))}
      </div>
    </div>
  );
}
function PublicFooter() {
  const settings = trpc.content.publicSettings.useQuery(undefined, {
    staleTime: 30_000,
  });
  const content = settings.data ?? {};
  const links = [
    ["Instagram", content["social.instagram"]],
    ["Facebook", content["social.facebook"]],
    ["LinkedIn", content["social.linkedin"]],
    ["TikTok", content["social.tiktok"]],
    ["YouTube", content["social.youtube"]],
  ].filter((entry): entry is [string, string] => {
    if (!entry[1]) return false;
    try {
      return new URL(entry[1]).protocol === "https:";
    } catch {
      return false;
    }
  });
  if (!shouldRenderPublicFooter(links.length)) return null;
  return (
    <footer className="w-full border-t border-border/60 bg-background/80 px-4 py-4 text-center text-xs text-muted-foreground">
      {links.length > 0 && (
        <nav
          className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2"
          aria-label="Gridora social media"
        >
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </footer>
  );
}
function AuthPanel({ onDone }: { onDone: () => void }) {
  const publicCopy = trpc.content.publicSettings.useQuery(undefined, {
    staleTime: 30_000,
  });
  const [mode, setMode] = useState<"login" | "register">("login");
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>(
    {}
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [authStatus, setAuthStatus] = useState<{
    kind: "pending" | "success" | "error";
    text: string;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    accountType: "designer" as "designer" | "client",
    bio: "",
    skills: "",
  });
  const showAuthError = (message: string) => {
    setAuthStatus({ kind: "error", text: message });
    toast.error(message);
  };
  const login = trpc.auth.login.useMutation({
    onSuccess: () => {
      setAuthStatus({
        kind: "success",
        text: "Signed in. Opening your Gridora workspace…",
      });
      toast.success("Welcome back to Gridora");
      onDone();
    },
    onError: e => showAuthError(getAuthErrorMessage("login", e.message)),
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      setAuthStatus({
        kind: "success",
        text: "Account created. Preparing your Gridora profile…",
      });
      toast.success("Account created — welcome to Gridora");
      onDone();
    },
    onError: e => showAuthError(getAuthErrorMessage("register", e.message)),
  });
  const update = (key: keyof typeof form, value: string) => {
    setForm(v => ({ ...v, [key]: value }));
    if (
      ["name", "username", "phone", "email", "password", "confirm"].includes(
        key
      )
    )
      setTouched(v => ({ ...v, [key]: true }));
  };
  const feedbackFor = (field: AuthField) =>
    getAuthFieldFeedback(mode, field, form, Boolean(touched[field]));
  const renderFeedback = (field: AuthField) => {
    const feedback = feedbackFor(field);
    if (!feedback) return null;
    return (
      <p
        id={`auth-${field}-feedback`}
        className={`mt-1 flex items-center gap-1 text-xs ${feedback.status === "invalid" ? "text-destructive" : "text-emerald-500"}`}
        role="status"
        aria-live="polite"
      >
        {feedback.status === "valid" ? <Check size={13} /> : <Info size={13} />}
        {feedback.message}
      </p>
    );
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setAuthStatus(null);
    setTouched({
      name: mode === "register",
      username: mode === "register",
      phone: true,
      email: mode === "register" && Boolean(form.email),
      password: true,
      confirm: mode === "register",
    });
    if (mode === "login") {
      const validationError = validateAuthForm("login", form);
      if (validationError) return showAuthError(validationError);
      setAuthStatus({
        kind: "pending",
        text: "Verifying your sign-in details…",
      });
      login.mutate({ identifier: form.phone, password: form.password });
    } else {
      const validationError = validateAuthForm("register", form);
      if (validationError) return showAuthError(validationError);
      setAuthStatus({ kind: "pending", text: "Creating your secure account…" });
      register.mutate({
        name: form.name,
        username: form.username,
        phone: form.phone,
        email: form.email,
        password: form.password,
        accountType: form.accountType,
        bio: form.bio,
        skills: form.skills,
      });
    }
  };
  const pending = login.isPending || register.isPending;
  return (
    <div className="auth-page h-[100dvh] min-h-0 overflow-y-auto overscroll-contain bg-background page-grid">
      <div className="container flex min-h-full flex-col justify-start py-6 sm:py-8 lg:flex-row lg:items-center lg:justify-center lg:gap-20">
        <div className="mb-8 max-w-xl lg:mb-0">
          <Brand />
          <div className="mt-10 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
              <Sparkles size={14} />
              {publicCopy.data?.["home.kicker"] ||
                "Built for people who make things"}
            </div>
            <h1 className="font-[Manrope] text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              {publicCopy.data?.["home.titleStart"] || "Your next"}{" "}
              <span className="text-primary">
                {publicCopy.data?.["home.titleAccent"] || "creative connection"}
              </span>{" "}
              {publicCopy.data?.["home.titleEnd"] || "starts here."}
            </h1>
            <p className="max-w-md text-base leading-7 text-muted-foreground">
              {publicCopy.data?.["home.tagline"] ||
                "Discover brilliant designers, build meaningful working relationships, and bring ambitious ideas to life."}
            </p>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Check size={16} className="text-primary" /> Real accounts
              </span>
              <span className="flex items-center gap-2">
                <Check size={16} className="text-primary" /> Private by design
              </span>
            </div>
          </div>
        </div>
        <div className="auth-form-panel w-full max-w-md rounded-[2rem] border bg-card p-5 soft-shadow sm:p-8">
          <div
            className="mb-6 flex rounded-xl bg-muted p-1"
            role="group"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              aria-pressed={mode === "login"}
              disabled={pending}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              onClick={() => {
                setMode("login");
                setAuthStatus(null);
                setTouched({});
              }}
            >
              Log in
            </button>
            <button
              type="button"
              aria-pressed={mode === "register"}
              disabled={pending}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === "register" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              onClick={() => {
                setMode("register");
                setAuthStatus(null);
                setTouched({});
              }}
            >
              Create account
            </button>
          </div>
          <form
            onSubmit={submit}
            className="auth-form space-y-4"
            aria-busy={pending}
            noValidate
          >
            {mode === "register" && (
              <>
                <div>
                  <Input
                    placeholder="Full name"
                    aria-label="Full name"
                    aria-invalid={feedbackFor("name")?.status === "invalid"}
                    aria-describedby={
                      touched.name ? "auth-name-feedback" : undefined
                    }
                    autoComplete="name"
                    value={form.name}
                    onChange={e => update("name", e.target.value)}
                  />
                  {renderFeedback("name")}
                </div>
                <div>
                  <Input
                    placeholder="Username (letters, numbers, underscore)"
                    aria-label="Username"
                    aria-invalid={feedbackFor("username")?.status === "invalid"}
                    aria-describedby={
                      touched.username ? "auth-username-feedback" : undefined
                    }
                    autoComplete="username"
                    value={form.username}
                    onChange={e =>
                      update(
                        "username",
                        e.target.value
                          .replace(/[^a-zA-Z0-9_]/g, "")
                          .slice(0, 48)
                      )
                    }
                  />
                  {renderFeedback("username")}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => update("accountType", "designer")}
                    className={`rounded-xl border p-3 text-left text-sm ${form.accountType === "designer" ? "border-primary bg-secondary" : ""}`}
                  >
                    <div className="font-bold">Designer</div>
                    <div className="text-xs text-muted-foreground">
                      Showcase your work
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => update("accountType", "client")}
                    className={`rounded-xl border p-3 text-left text-sm ${form.accountType === "client" ? "border-primary bg-secondary" : ""}`}
                  >
                    <div className="font-bold">Client</div>
                    <div className="text-xs text-muted-foreground">
                      Find great talent
                    </div>
                  </button>
                </div>
                {form.accountType === "designer" && (
                  <>
                    <Input
                      placeholder="Skills e.g. Brand, UI/UX, Motion"
                      aria-label="Professional skills"
                      value={form.skills}
                      onChange={e => update("skills", e.target.value)}
                    />
                    <Textarea
                      placeholder="A short professional bio"
                      aria-label="Professional bio"
                      value={form.bio}
                      onChange={e => update("bio", e.target.value)}
                    />
                  </>
                )}
                <div>
                  <Input
                    type="email"
                    placeholder="Email (optional)"
                    aria-label="Email address (optional)"
                    aria-invalid={feedbackFor("email")?.status === "invalid"}
                    aria-describedby={
                      touched.email ? "auth-email-feedback" : undefined
                    }
                    autoComplete="email"
                    value={form.email}
                    onChange={e => update("email", e.target.value)}
                  />
                  {renderFeedback("email")}
                </div>
              </>
            )}
            <div>
              <Input
                inputMode={mode === "login" ? "text" : "tel"}
                type={mode === "login" ? "text" : "tel"}
                aria-label={
                  mode === "login"
                    ? "Name, username, phone, or email"
                    : "Phone number"
                }
                aria-invalid={feedbackFor("phone")?.status === "invalid"}
                aria-describedby={
                  touched.phone ? "auth-phone-feedback" : undefined
                }
                autoComplete={mode === "login" ? "username" : "tel"}
                required
                placeholder={
                  mode === "login"
                    ? "Name, username, phone, or email"
                    : "Phone number"
                }
                value={form.phone}
                onChange={e => update("phone", e.target.value)}
              />
              {renderFeedback("phone")}
            </div>
            <div>
              <div className="relative">
                <Input
                  className="pr-12"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  aria-label="Password"
                  aria-invalid={feedbackFor("password")?.status === "invalid"}
                  aria-describedby={
                    touched.password ? "auth-password-feedback" : undefined
                  }
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  value={form.password}
                  onChange={e => update("password", e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 grid w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(value => !value)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {renderFeedback("password")}
            </div>
            {mode === "register" && (
              <>
                <PasswordEligibility
                  password={form.password}
                  confirm={form.confirm}
                />
                <div>
                  <div className="relative">
                    <Input
                      className="pr-12"
                      type={showConfirmation ? "text" : "password"}
                      placeholder="Confirm password"
                      aria-label="Confirm password"
                      aria-invalid={
                        feedbackFor("confirm")?.status === "invalid"
                      }
                      aria-describedby={
                        touched.confirm ? "auth-confirm-feedback" : undefined
                      }
                      autoComplete="new-password"
                      required
                      value={form.confirm}
                      onChange={e => update("confirm", e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-2 grid w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={
                        showConfirmation
                          ? "Hide confirmation password"
                          : "Show confirmation password"
                      }
                      aria-pressed={showConfirmation}
                      onClick={() => setShowConfirmation(value => !value)}
                    >
                      {showConfirmation ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                  {renderFeedback("confirm")}
                </div>
              </>
            )}
            {authStatus && (
              <div
                className={`auth-status flex items-start gap-2.5 rounded-xl border px-3 py-3 text-sm leading-5 ${authStatus.kind === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : authStatus.kind === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-primary/25 bg-primary/10 text-foreground"}`}
                role={authStatus.kind === "error" ? "alert" : "status"}
                aria-live={authStatus.kind === "error" ? "assertive" : "polite"}
                aria-atomic="true"
              >
                {authStatus.kind === "pending" ? (
                  <Loader2
                    size={17}
                    className="mt-0.5 shrink-0 animate-spin text-primary"
                    aria-hidden="true"
                  />
                ) : authStatus.kind === "success" ? (
                  <Check
                    size={17}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Info
                    size={17}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>{authStatus.text}</span>
              </div>
            )}
            <Button
              className="h-12 w-full rounded-xl font-bold"
              disabled={pending}
              aria-label={
                pending
                  ? mode === "login"
                    ? "Signing in"
                    : "Creating account"
                  : undefined
              }
            >
              {pending ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "login" ? (
                "Enter Gridora"
              ) : (
                "Create my account"
              )}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Your account is stored securely in Gridora's database. No Google
            login required.
          </p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

function ConnectionRequests({ onChanged }: { onChanged: () => void }) {
  const incoming = trpc.connections.incoming.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const respond = trpc.connections.respond.useMutation({
    onSuccess: data => {
      toast.success(
        data.status === "accepted" ? "Connection accepted" : "Request declined"
      );
      incoming.refetch();
      onChanged();
    },
    onError: e => toast.error(e.message),
  });
  if (!incoming.data?.length) return null;
  return (
    <section className="border-b bg-secondary/50 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-primary">
        Connection requests
      </p>
      <div className="space-y-2">
        {incoming.data.map(item => (
          <div
            key={item.request.id}
            className="flex items-center gap-3 rounded-2xl bg-card p-3"
          >
            <Avatar name={item.sender.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{item.sender.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                @{item.sender.username} wants to connect
              </p>
            </div>
            <Button
              size="sm"
              className="rounded-xl"
              disabled={respond.isPending}
              onClick={() =>
                respond.mutate({ requestId: item.request.id, action: "accept" })
              }
            >
              <Check size={14} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={respond.isPending}
              onClick={() =>
                respond.mutate({
                  requestId: item.request.id,
                  action: "decline",
                })
              }
            >
              <X size={14} />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
function ChatView({
  user,
  onFullScreen,
  initialChatId,
}: {
  user: any;
  onFullScreen: (active: boolean) => void;
  initialChatId?: number | null;
}) {
  const [activeChat, setActiveChat] = useState<number | null>(
    initialChatId ?? null
  );
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [attachment, setAttachment] = useState<{
    dataUrl: string;
    name: string;
    type: string;
  }>();
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerCanDownload, setViewerCanDownload] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const chats = trpc.chats.list.useQuery(undefined, {
    retry: false,
    refetchInterval: 5000,
  });
  const messageInput = useMemo(
    () => ({
      chatId: activeChat!,
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [activeChat, search]
  );
  const messages = trpc.chats.messages.useQuery(messageInput, {
    enabled: Boolean(activeChat),
    refetchInterval: 2000,
  });
  const unread = trpc.notifications.unread.useQuery(undefined, {
    retry: false,
    refetchInterval: 5000,
  });
  useEffect(() => {
    onFullScreen(Boolean(activeChat));
    return () => onFullScreen(false);
  }, [activeChat, onFullScreen]);
  useEffect(() => {
    if (historyRef.current && !search)
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [messages.data?.length, activeChat, search]);
  const send = trpc.chats.send.useMutation({
    onSuccess: () => {
      setBody("");
      setAttachment(undefined);
      setReplyTo(null);
      setViewOnce(false);
      messages.refetch();
      chats.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const edit = trpc.chats.edit.useMutation({
    onSuccess: () => {
      setEditingMessage(null);
      setBody("");
      messages.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const viewOnceMessage = trpc.chats.viewOnce.useMutation({
    onSuccess: () => messages.refetch(),
    onError: e => toast.error(e.message),
  });
  const remove = trpc.chats.delete.useMutation({
    onSuccess: () => messages.refetch(),
    onError: e => toast.error(e.message),
  });
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024)
      return toast.error("Files must be 5MB or smaller");
    const reader = new FileReader();
    reader.onload = () =>
      setAttachment({
        dataUrl: String(reader.result),
        name: file.name,
        type: file.type,
      });
    reader.readAsDataURL(file);
  };
  const active = chats.data?.find(chat => chat.id === activeChat);
  const partner = active?.partner;
  const emojis = ["😀", "😂", "❤️", "👍", "😮", "😢", "🙏", "✨"];
  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() && !attachment)
      return toast.error("Write a message or attach a file");
    if (editingMessage) {
      edit.mutate({ messageId: editingMessage.id, body: body.trim() });
      return;
    }
    send.mutate({
      chatId: activeChat!,
      body: body.trim() || "Shared an attachment",
      replyToId: replyTo?.id,
      viewOnce: viewOnce && Boolean(attachment),
      attachment,
    });
  };
  const conversation = activeChat ? (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      {viewerUrl && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/95 p-4">
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white"
            onClick={() => setViewerUrl(null)}
          >
            <X />
          </button>
          <img
            src={viewerUrl}
            alt="Full-size attachment"
            className="max-h-[90dvh] max-w-full rounded-xl object-contain"
          />
          {viewerCanDownload && (
            <a
              href={viewerUrl}
              download="gridora-image"
              className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black"
            >
              Download image
            </a>
          )}
        </div>
      )}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card/95 px-3 pt-[env(safe-area-inset-top)] sm:px-4">
        <button
          className="rounded-xl p-2 hover:bg-muted"
          onClick={() => {
            setActiveChat(null);
            setSearch("");
          }}
          aria-label="Back to chats"
        >
          <ChevronLeft />
        </button>
        <button
          className="shrink-0"
          onClick={() => partner?.avatarUrl && setViewerUrl(partner.avatarUrl)}
          aria-label="View profile photo"
        >
          <Avatar
            name={partner?.name || active?.title || "Conversation"}
            avatarUrl={partner?.avatarUrl}
            size="sm"
          />
        </button>
        <div className="min-w-0">
          <p className="truncate font-bold">
            {partner?.name || active?.title || "Conversation"}
            {partner?.verified && (
              <span
                className="ml-1 text-primary"
                title="Verified Gridora profile"
              >
                ✓
              </span>
            )}
          </p>
          <p className="text-xs text-emerald-400">
            {active?.adminOnly
              ? "Official Gridora support"
              : partner
                ? "Connected"
                : "Gridora Community"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted"
            onClick={() => setSearch(v => (v ? "" : " "))}
            aria-label="Search messages"
          >
            <Search size={18} />
          </button>
          <button
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted"
            aria-label="More options"
          >
            <span className="text-xl">⋮</span>
          </button>
        </div>
      </header>
      {search !== "" && (
        <div className="shrink-0 border-b bg-card px-4 py-2">
          <Input
            autoFocus
            value={search.trim()}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search in this conversation"
            className="h-10 rounded-xl bg-muted"
          />
        </div>
      )}
      <div
        ref={historyRef}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-4 sm:p-6"
      >
        {messages.isLoading ? (
          <Loader2 className="mx-auto animate-spin text-primary" />
        ) : messages.data?.length ? (
          messages.data.map((message, index) => {
            const previous = messages.data?.[index - 1];
            const currentDay = new Date(message.createdAt).toDateString();
            const previousDay = previous
              ? new Date(previous.createdAt).toDateString()
              : "";
            const image = Boolean(
              message.attachmentUrl &&
                message.attachmentType?.startsWith("image/")
            );
            return (
              <div key={message.id}>
                {currentDay !== previousDay && (
                  <div className="my-3 text-center text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">
                    {new Date(message.createdAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}
                <div
                  id={`message-${message.id}`}
                  className={`group flex ${message.senderId === user.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[min(82%,38rem)] rounded-2xl px-4 py-3 text-sm ${message.senderId === user.id ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card shadow-sm"}`}
                  >
                    <div className="mb-1 hidden gap-1 group-hover:flex">
                      <button
                        className="text-[10px] opacity-70"
                        onClick={() => setReplyTo(message)}
                      >
                        Reply
                      </button>
                      <button
                        className="text-[10px] opacity-70"
                        onClick={() => {
                          navigator.clipboard?.writeText(message.body);
                          toast.success("Copied");
                        }}
                      >
                        Copy
                      </button>
                      {message.senderId === user.id && !message.deletedAt && (
                        <button
                          className="text-[10px] opacity-70"
                          onClick={() => {
                            setEditingMessage(message);
                            setBody(message.body);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {message.senderId === user.id && (
                        <button
                          className="text-[10px] opacity-70"
                          onClick={() =>
                            remove.mutate({ messageId: message.id })
                          }
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {message.replyToId && (
                      <div className="mb-2 rounded-lg bg-black/15 px-2 py-1 text-xs opacity-80">
                        Replying to message
                      </div>
                    )}
                    {image ? (
                      <button
                        onClick={() => {
                          setViewerUrl(message.attachmentUrl!);
                          const isViewOnce = Boolean(message.viewOnce);
                          setViewerCanDownload(!isViewOnce);
                          if (isViewOnce && message.senderId !== user.id)
                            viewOnceMessage.mutate({ messageId: message.id });
                        }}
                      >
                        <img
                          src={message.attachmentUrl!}
                          alt={message.attachmentName || "Shared image"}
                          className="max-h-72 max-w-full rounded-xl object-contain"
                        />
                        {message.viewOnce && (
                          <span className="mt-1 block text-left text-[10px] font-bold uppercase tracking-wider text-primary">
                            View once image
                          </span>
                        )}
                      </button>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">
                        {message.body}
                      </p>
                    )}
                    {message.attachmentUrl && !image && (
                      <a
                        href={message.attachmentUrl}
                        download={message.attachmentName || "gridora-file"}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 flex items-center gap-2 rounded-xl bg-black/10 p-2 text-xs underline"
                      >
                        <FileText size={14} />
                        Download {message.attachmentName || "attachment"}
                      </a>
                    )}
                    {message.editedAt && (
                      <span className="mr-2 text-[10px] opacity-60">
                        edited
                      </span>
                    )}
                    <p className="mt-1 text-right text-[10px] opacity-60">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      {message.senderId === user.id && "✓"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="m-auto max-w-xs text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary">
              <MessageCircle />
            </div>
            <p className="font-bold">
              {partner
                ? `You’re connected with ${partner.name}.`
                : "Welcome to Gridora Community."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a conversation.
            </p>
          </div>
        )}
      </div>
      {active?.adminOnly && user.role !== "admin" ? (
        <div className="shrink-0 border-t bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground">
          This is an official Gridora message. Replies are not available in this
          thread.
        </div>
      ) : (
        <form
          onSubmit={sendMessage}
          className="relative shrink-0 border-t bg-card p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:p-4"
        >
          {editingMessage && (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-xs">
              <span>Editing your message</span>
              <button
                type="button"
                onClick={() => {
                  setEditingMessage(null);
                  setBody("");
                }}
              >
                Cancel
              </button>
            </div>
          )}
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  Replying to{" "}
                  {replyTo.senderId === user.id
                    ? "your message"
                    : "this message"}
                </p>
                <p className="truncate text-muted-foreground">{replyTo.body}</p>
              </div>
              <button type="button" onClick={() => setReplyTo(null)}>
                <X size={15} />
              </button>
            </div>
          )}
          {emojiOpen && (
            <div className="absolute bottom-20 left-3 z-10 grid grid-cols-4 gap-2 rounded-2xl border bg-card p-3 shadow-2xl">
              {emojis.map(emoji => (
                <button
                  type="button"
                  key={emoji}
                  className="rounded-xl p-2 text-xl hover:bg-muted"
                  onClick={() => {
                    setBody(v => v + emoji);
                    setEmojiOpen(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl hover:bg-muted"
              onClick={() => setEmojiOpen(v => !v)}
              aria-label="Emoji picker"
            >
              😊
            </button>
            <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-secondary text-primary">
              <Plus size={19} />
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain"
                onChange={onFile}
              />
            </label>
            <Input
              value={body}
              onChange={e => setBody(e.target.value)}
              className="h-11 min-w-0 rounded-xl bg-muted"
              placeholder={editingMessage ? "Edit message…" : "Type a message…"}
            />
            <Button
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl"
              disabled={send.isPending}
            >
              <ChevronRight size={19} />
            </Button>
          </div>
          {attachment && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-xs">
              <button
                type="button"
                onClick={() => setViewOnce(v => !v)}
                className={`rounded-lg px-2 py-1 font-bold ${viewOnce ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                View once
              </button>
              <span className="truncate">{attachment.name}</span>
              <button type="button" onClick={() => setAttachment(undefined)}>
                <X size={14} />
              </button>
            </div>
          )}
        </form>
      )}
    </section>
  ) : (
    <>
      <aside className="min-h-0 overflow-y-auto border-r bg-card/60 lg:w-[330px] lg:shrink-0">
        <div className="p-5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">
                Inbox
              </p>
              <h1 className="font-[Manrope] text-2xl font-extrabold">
                Your chats
              </h1>
            </div>
            <div className="relative">
              <Bell className="text-primary" size={19} />
              {unread.data?.length ? (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                  {unread.data.length}
                </span>
              ) : null}
            </div>
          </div>
          <div className="relative">
            <Search
              className="absolute left-3 top-3 text-muted-foreground"
              size={17}
            />
            <Input
              className="h-11 rounded-xl border-0 bg-muted pl-10"
              placeholder="Search conversations"
            />
          </div>
        </div>
        <ConnectionRequests onChanged={() => chats.refetch()} />
        <div className="space-y-1 p-2">
          {chats.isLoading ? (
            <div className="p-6 text-center">
              <Loader2 className="mx-auto animate-spin" />
            </div>
          ) : chats.data?.length ? (
            chats.data.map((chat, i) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-muted"
              >
                <Avatar
                  name={chat.partner?.name || chat.title || "Community"}
                  avatarUrl={chat.partner?.avatarUrl}
                  index={i}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between">
                    <span className="truncate font-bold">
                      {chat.partner?.name || chat.title || "Gridora Community"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      live
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    Open conversation
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-5 py-10 text-center">
              <MessageCircle
                className="mx-auto mb-3 text-primary/50"
                size={30}
              />
              <p className="font-bold">Your inbox is quiet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Accept a connection request to unlock private chat.
              </p>
            </div>
          )}
        </div>
      </aside>
      <section className="hidden min-w-0 flex-1 place-items-center bg-background lg:grid">
        <div className="max-w-sm text-center">
          <Brand compact />
          <h2 className="mt-5 font-[Manrope] text-2xl font-extrabold">
            Pick a conversation
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Accepted connections appear here with live message refresh and
            secure attachment sharing.
          </p>
        </div>
      </section>
    </>
  );
  return <div className="flex min-h-0 flex-1">{conversation}</div>;
}

function ConnectionButton({ userId }: { userId: number }) {
  const utils = trpc.useUtils();
  const status = trpc.connections.status.useQuery(
    { userId },
    { refetchInterval: 5000 }
  );
  const request = trpc.connections.request.useMutation({
    onSuccess: () => {
      toast.success("Connection request sent");
      utils.connections.status.invalidate({ userId });
    },
    onError: e => toast.error(e.message),
  });
  const value = status.data || "connect";
  if (value === "blocked")
    return (
      <Button variant="outline" className="rounded-xl" disabled>
        Blocked
      </Button>
    );
  if (value === "connected")
    return (
      <Button variant="outline" className="rounded-xl" disabled>
        <Check size={16} /> Connected
      </Button>
    );
  if (value === "request_sent")
    return (
      <Button variant="outline" className="rounded-xl" disabled>
        Request sent
      </Button>
    );
  if (value === "accept")
    return (
      <Button variant="outline" className="rounded-xl" disabled>
        Awaiting response
      </Button>
    );
  return (
    <Button
      className="rounded-xl"
      onClick={() => request.mutate({ receiverId: userId })}
      disabled={request.isPending}
    >
      Connect
    </Button>
  );
}
function DiscoverView({
  onOpenProfile,
}: {
  onOpenProfile: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const people = trpc.discover.list.useQuery({ search });
  const statuses = trpc.statuses.list.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const [viewedStatus, setViewedStatus] = useState<any>(null);
  const viewStatus = trpc.statuses.view.useMutation({
    onSuccess: data => setViewedStatus(data),
    onError: e => toast.error(e.message),
  });
  return (
    <div className="container py-5 lg:py-8">
      {viewedStatus && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/95 p-5">
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white"
            onClick={() => setViewedStatus(null)}
            aria-label="Close status"
          >
            <X />
          </button>
          <div className="max-w-xl text-center text-white">
            {viewedStatus.imageUrl && (
              <img
                src={viewedStatus.imageUrl}
                alt="Status"
                className="max-h-[70dvh] max-w-full rounded-2xl object-contain"
              />
            )}
            <p className="mt-4 text-lg">{viewedStatus.body}</p>
            {(() => {
              const items = (statuses.data || []).filter(
                (item: any) => item.author.id === viewedStatus.ownerId
              );
              const index = items.findIndex(
                (item: any) => item.id === viewedStatus.id
              );
              return items.length > 1 ? (
                <div className="mt-3 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={index <= 0}
                    onClick={() =>
                      viewStatus.mutate({ statusId: items[index - 1].id })
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={index >= items.length - 1}
                    onClick={() =>
                      viewStatus.mutate({ statusId: items[index + 1].id })
                    }
                  >
                    Next
                  </Button>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">
            Discover
          </p>
          <h1 className="font-[Manrope] text-3xl font-extrabold tracking-tight">
            Find your people
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse registered Gridora people and send a real connection request.
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search
            className="absolute left-3 top-3 text-muted-foreground"
            size={17}
          />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-11 rounded-xl bg-card pl-10"
            placeholder="Name, username, skill or phone"
          />
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {people.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted" />
          ))
        ) : people.data?.length ? (
          people.data.map((person, i) => (
            <div
              key={person.id}
              className="group rounded-3xl border bg-card p-5 soft-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="shrink-0 rounded-2xl"
                    onClick={() => {
                      const status = statuses.data?.find(
                        (item: any) => item.author.id === person.id
                      );
                      if (status) viewStatus.mutate({ statusId: status.id });
                      else onOpenProfile(person.id);
                    }}
                    aria-label={`Open ${person.name}'s profile or status`}
                  >
                    <Avatar
                      name={person.name}
                      avatarUrl={person.avatarUrl}
                      index={i}
                      size="lg"
                      hasStatus={statuses.data?.some(
                        (item: any) => item.author.id === person.id
                      )}
                    />
                  </button>
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold">{person.name}</h3>
                      {person.verified && (
                        <span
                          className="text-primary"
                          title="Verified Gridora profile"
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{person.username}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {person.accountType}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">
                  {person.availability || "Available"}
                </span>
              </div>
              <p className="mt-5 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                {person.bio ||
                  "Building thoughtful work and meaningful connections."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(person.skills || "Open to connect")
                  .split(",")
                  .slice(0, 3)
                  .map(skill => (
                    <span
                      key={skill}
                      className="rounded-lg bg-muted px-2 py-1 text-[11px] font-semibold"
                    >
                      {skill.trim()}
                    </span>
                  ))}
              </div>
              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => onOpenProfile(person.id)}
                >
                  View profile
                </Button>
                <ConnectionButton userId={person.id} />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-3xl border border-dashed p-12 text-center">
            <Compass className="mx-auto mb-3 text-primary" />
            <p className="font-bold">No other Gridora users found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different name, username, skill, or phone number.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CommunityFeed() {
  const feed = trpc.posts.feed.useQuery(undefined, { refetchInterval: 5000 });
  const create = trpc.posts.create.useMutation({
    onSuccess: () => {
      toast.success("Posted to the community");
      feed.refetch();
    },
  });
  const like = trpc.posts.like.useMutation({ onSuccess: () => feed.refetch() });
  const [body, setBody] = useState("");
  return (
    <section className="mt-12 max-w-3xl">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">
            Community
          </p>
          <h2 className="font-[Manrope] text-2xl font-extrabold">
            Gridora conversations
          </h2>
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users size={14} /> Designers & clients
        </span>
      </div>
      <div className="rounded-3xl border bg-card p-4">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Share something useful with the community…"
          className="min-h-20 resize-none border-0 bg-muted"
        />
        <div className="mt-3 flex justify-end">
          <Button
            disabled={!body.trim() || create.isPending}
            onClick={() => {
              create.mutate({ body });
              setBody("");
            }}
            className="rounded-xl"
          >
            Publish post
          </Button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {feed.data?.map((post: any) => (
          <article key={post.id} className="rounded-3xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <Avatar name={post.author.name} size="sm" />
              <div>
                <p className="text-sm font-bold">{post.author.name}</p>
                <p className="text-xs text-muted-foreground">
                  @{post.author.username} ·{" "}
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6">{post.body}</p>
            <button
              onClick={() => like.mutate({ postId: post.id })}
              className="mt-4 flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"
            >
              <Heart size={15} /> Like
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProfileModerationActions({ targetUserId }: { targetUserId: number }) {
  const utils = trpc.useUtils();
  const [reason, setReason] = useState("");
  const status = trpc.moderation.blockStatus.useQuery({ userId: targetUserId });
  const refresh = async () => {
    await Promise.all([
      status.refetch(),
      utils.discover.list.invalidate(),
      utils.chats.list.invalidate(),
      utils.connections.status.invalidate({ userId: targetUserId }),
    ]);
  };
  const block = trpc.moderation.blockUser.useMutation({
    onSuccess: async () => {
      toast.success("User blocked");
      await refresh();
    },
    onError: error => toast.error(error.message),
  });
  const unblock = trpc.moderation.unblockUser.useMutation({
    onSuccess: async () => {
      toast.success("User unblocked");
      await refresh();
    },
    onError: error => toast.error(error.message),
  });
  const report = trpc.moderation.submitUserReport.useMutation({
    onSuccess: () => {
      toast.success("Report sent to Gridora administration");
      setReason("");
    },
    onError: error => toast.error(error.message),
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        disabled={block.isPending || unblock.isPending || status.isLoading}
        onClick={() =>
          status.data?.blockedByMe
            ? unblock.mutate({ userId: targetUserId })
            : block.mutate({ userId: targetUserId })
        }
      >
        {status.data?.blockedByMe ? "Unblock user" : "Block user"}
      </Button>
      {status.data?.blockedMe && (
        <span className="text-xs text-muted-foreground">
          This user has blocked this account.
        </span>
      )}
      <details className="w-full sm:w-auto">
        <summary className="cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          Report profile
        </summary>
        <div className="mt-2 space-y-2 rounded-xl border bg-background p-3 sm:absolute sm:z-20 sm:w-80">
          <Textarea
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="Explain the concern (5–1,500 characters)"
            maxLength={1500}
            className="min-h-24"
          />
          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={reason.trim().length < 5 || report.isPending}
            onClick={() => report.mutate({ userId: targetUserId, reason })}
          >
            {report.isPending ? "Sending report…" : "Send report"}
          </Button>
        </div>
      </details>
    </div>
  );
}

function ProfileView({
  user,
  profileId,
  goBack,
}: {
  user: any;
  profileId: number | null;
  goBack: () => void;
}) {
  const ownProfile = !profileId || profileId === user.id;
  const { refresh } = useAuth();
  const profile = trpc.discover.profile.useQuery(
    { id: profileId || user.id },
    { enabled: Boolean(profileId || user.id) }
  );
  const data: any = profile.data || user;
  const ratingCount = Number(data.ratingCount || 0);
  const displayedStars = data.onboardingRating
    ? 5
    : Math.min(5, Math.floor(ratingCount / 40));
  const [editing, setEditing] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [form, setForm] = useState({
    name: user.name || "",
    username: user.username || "",
    bio: user.bio || "",
    skills: user.skills || "",
    location: user.location || "",
    website: user.website || "",
    availability: user.availability || "Available for projects",
  });
  const [project, setProject] = useState({
    title: "",
    description: "",
    category: "",
    coverUrl: "",
    coverDataUrl: "",
  });
  const statuses = trpc.statuses.list.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const [statusBody, setStatusBody] = useState("");
  const [statusDataUrl, setStatusDataUrl] = useState("");
  const [statusViewer, setStatusViewer] = useState<any>(null);
  const statusAnalytics = trpc.statuses.viewers.useQuery(
    { statusId: statusViewer?.id || 0 },
    { enabled: Boolean(statusViewer?.canSeeStats && statusViewer?.id) }
  );
  const createStatus = trpc.statuses.create.useMutation({
    onSuccess: () => {
      toast.success("Status posted for 24 hours");
      setStatusBody("");
      setStatusDataUrl("");
      statuses.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const viewStatus = trpc.statuses.view.useMutation({
    onSuccess: data => setStatusViewer(data),
    onError: e => toast.error(e.message),
  });
  const likeStatus = trpc.statuses.like.useMutation({
    onSuccess: () => {
      toast.success("Status liked");
      statuses.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const [profileImageViewer, setProfileImageViewer] = useState<string | null>(
    null
  );
  const [editingProject, setEditingProject] = useState<number>();
  const update = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      setEditing(false);
      profile.refetch();
      refresh();
    },
    onError: e => toast.error(e.message),
  });
  const saveProject = trpc.profile.portfolio.save.useMutation({
    onSuccess: () => {
      toast.success("Portfolio saved");
      setEditingProject(undefined);
      setProject({
        title: "",
        description: "",
        category: "",
        coverUrl: "",
        coverDataUrl: "",
      });
      profile.refetch();
    },
    onError: e => toast.error(e.message),
  });
  const removeProject = trpc.profile.portfolio.remove.useMutation({
    onSuccess: () => profile.refetch(),
  });
  const saveSlot = trpc.profile.availability.save.useMutation({
    onSuccess: () => {
      toast.success("Availability saved");
      profile.refetch();
    },
  });
  const editProject = (item: any) => {
    setEditingProject(item.id);
    setProject({
      title: item.title,
      description: item.description || "",
      category: item.category || "",
      coverUrl: item.coverUrl || "",
      coverDataUrl: "",
    });
  };
  return (
    <>
      {profileImageViewer && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/95 p-5">
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white"
            onClick={() => setProfileImageViewer(null)}
          >
            <X />
          </button>
          <img
            src={profileImageViewer}
            alt="Profile"
            className="max-h-[90dvh] max-w-full object-contain"
          />
        </div>
      )}
      {statusViewer && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/95 p-5">
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white"
            onClick={() => setStatusViewer(null)}
          >
            <X />
          </button>
          <div className="max-w-xl text-center text-white">
            {statusViewer.imageUrl && (
              <img
                src={statusViewer.imageUrl}
                alt="Status"
                className="max-h-[70dvh] max-w-full rounded-2xl object-contain"
              />
            )}
            <p className="mt-4 text-lg">{statusViewer.body}</p>
            {statusViewer.ownerId !== user.id && (
              <Button
                className="mt-4 rounded-xl"
                onClick={() => likeStatus.mutate({ statusId: statusViewer.id })}
              >
                Like status
              </Button>
            )}
            {statusViewer.canSeeStats && (
              <div className="mt-4 max-h-[24dvh] overflow-y-auto rounded-2xl bg-white/10 p-3 text-left text-xs text-white/90">
                <p className="font-bold">
                  {statusViewer.viewCount || 0} views ·{" "}
                  {statusViewer.likeCount || 0} likes
                </p>
                {statusAnalytics.data?.viewers?.length ? (
                  <div className="mt-2">
                    <p className="font-semibold">Viewed by</p>
                    {statusAnalytics.data.viewers.map((person: any) => (
                      <p key={person.id} className="mt-1">
                        {person.name || person.username}
                      </p>
                    ))}
                  </div>
                ) : null}
                {statusAnalytics.data?.likes?.length ? (
                  <div className="mt-2">
                    <p className="font-semibold">Liked by</p>
                    {statusAnalytics.data.likes.map((person: any) => (
                      <p key={person.id} className="mt-1">
                        {person.name || person.username}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
            {(() => {
              const ownerStatuses = (statuses.data || []).filter(
                (item: any) => item.author.id === statusViewer.ownerId
              );
              const currentIndex = ownerStatuses.findIndex(
                (item: any) => item.id === statusViewer.id
              );
              return ownerStatuses.length > 1 ? (
                <div className="mt-3 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={currentIndex <= 0}
                    onClick={() =>
                      viewStatus.mutate({
                        statusId: ownerStatuses[currentIndex - 1].id,
                      })
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={currentIndex >= ownerStatuses.length - 1}
                    onClick={() =>
                      viewStatus.mutate({
                        statusId: ownerStatuses[currentIndex + 1].id,
                      })
                    }
                  >
                    Next
                  </Button>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
      <div className="container py-6 lg:py-10">
        {profileId && (
          <button
            onClick={goBack}
            className="mb-6 flex items-center gap-2 text-sm font-bold text-primary"
          >
            <ChevronLeft size={16} /> Back to discover
          </button>
        )}
        <div className="rounded-[2rem] border bg-card p-6 soft-shadow sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              className={`relative rounded-[1.4rem] p-1 ${statuses.data?.some((item: any) => item.author.id === data.id) ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
            >
              <button
                onClick={() => {
                  const status = statuses.data?.find(
                    (item: any) => item.author.id === data.id
                  );
                  if (status) viewStatus.mutate({ statusId: status.id });
                  else if (data.avatarUrl)
                    setProfileImageViewer(data.avatarUrl);
                }}
              >
                <Avatar
                  name={data.name}
                  avatarUrl={
                    avatarDataUrl || (removeAvatar ? null : data.avatarUrl)
                  }
                  size="lg"
                />
              </button>
              {ownProfile && editing && (
                <label className="absolute -bottom-2 -right-2 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground">
                  <FileImage size={14} />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024)
                        return toast.error("Images must be 5MB or smaller");
                      const r = new FileReader();
                      r.onload = () => {
                        setAvatarDataUrl(String(r.result));
                        setRemoveAvatar(false);
                      };
                      r.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
              {ownProfile && editing && data.avatarUrl && (
                <button
                  type="button"
                  className="absolute -bottom-2 -left-2 rounded-full bg-card px-2 py-1 text-[10px] font-bold text-destructive shadow"
                  onClick={() => {
                    setAvatarDataUrl("");
                    setRemoveAvatar(true);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-[Manrope] text-3xl font-extrabold">
                  {data.name}
                </h1>
                {data.verified && (
                  <span
                    className="text-primary"
                    title="Verified Gridora profile"
                  >
                    ✓
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm font-bold text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={15}
                    className={
                      i < displayedStars ? "fill-current" : "opacity-25"
                    }
                  />
                ))}
                <span className="text-foreground">
                  {data.onboardingRating
                    ? "Initial 5-star rating"
                    : `${ratingCount} ${ratingCount === 1 ? "rating" : "ratings"}`}
                </span>
              </div>
              <span className="mt-2 inline-flex rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">
                {data.accountType === "designer" ? "DESIGNER" : "CLIENT"}
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                @{data.username} · {data.location || "Location not set"}
              </p>
            </div>
            {ownProfile && (
              <Button
                className="rounded-xl"
                onClick={() => setEditing(v => !v)}
              >
                {editing ? "Close editor" : "Edit profile"}
              </Button>
            )}
            {!ownProfile && <ProfileModerationActions targetUserId={data.id} />}
          </div>
          {editing && ownProfile ? (
            <div className="mt-6 grid gap-3 rounded-2xl bg-muted/60 p-4 sm:grid-cols-2">
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
              <Input
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="Username (letters, numbers, underscore)"
              />
              <Input
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Location"
              />
              <Input
                value={form.website}
                onChange={e => setForm({ ...form, website: e.target.value })}
                placeholder="Website URL"
              />
              <Input
                value={form.availability}
                onChange={e =>
                  setForm({ ...form, availability: e.target.value })
                }
                placeholder="Availability headline"
              />
              <Input
                value={form.skills}
                onChange={e => setForm({ ...form, skills: e.target.value })}
                placeholder="Skills, comma separated"
              />
              <Textarea
                className="sm:col-span-2"
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Professional bio"
              />
              <div className="sm:col-span-2 rounded-2xl border bg-card p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
                  24-hour status
                </p>
                <div className="flex gap-2">
                  <Input
                    value={statusBody}
                    onChange={e => setStatusBody(e.target.value)}
                    placeholder="Share a status update"
                  />
                  <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-secondary text-primary">
                    <FileImage size={16} />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 8 * 1024 * 1024)
                          return toast.error(
                            "Status images must be 8MB or smaller"
                          );
                        const r = new FileReader();
                        r.onload = () => setStatusDataUrl(String(r.result));
                        r.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    className="rounded-xl"
                    disabled={
                      (!statusBody.trim() && !statusDataUrl) ||
                      createStatus.isPending
                    }
                    onClick={() =>
                      createStatus.mutate({
                        body: statusBody,
                        imageDataUrl: statusDataUrl || undefined,
                      })
                    }
                  >
                    Post
                  </Button>
                </div>
                {statuses.data
                  ?.filter(
                    (item: any) =>
                      item.author.id === user.id && item.canSeeStats
                  )
                  .map((item: any) => (
                    <p
                      key={item.id}
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      Your current status · {item.viewCount || 0} views ·{" "}
                      {item.likeCount || 0} likes
                    </p>
                  ))}
              </div>
              <Button
                className="rounded-xl sm:col-span-2"
                onClick={() =>
                  update.mutate({
                    ...form,
                    avatarDataUrl: avatarDataUrl || undefined,
                    removeAvatar,
                  })
                }
                disabled={update.isPending}
              >
                Save profile
              </Button>
              {avatarDataUrl && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl sm:col-span-2"
                  onClick={() => setAvatarDataUrl("")}
                >
                  Cancel photo change
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-6 max-w-2xl leading-7 text-muted-foreground">
              {data.bio ||
                "Your Gridora profile is ready for the story behind your work."}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {(data.skills || "Strategy, UI/UX, Brand systems")
              .split(",")
              .map((skill: string) => (
                <span
                  key={skill}
                  className="rounded-xl bg-muted px-3 py-2 text-xs font-bold"
                >
                  {skill.trim()}
                </span>
              ))}
          </div>
        </div>
        <div className="mt-8 flex items-center justify-between">
          <div>
            <h2 className="font-[Manrope] text-2xl font-extrabold">
              Portfolio
            </h2>
            <p className="text-sm text-muted-foreground">
              Selected work and case studies
            </p>
          </div>
          {ownProfile && data.accountType === "designer" && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditingProject(0)}
            >
              <Plus size={16} /> Add project
            </Button>
          )}
        </div>
        {ownProfile &&
          data.accountType === "designer" &&
          editingProject !== undefined && (
            <div className="mt-4 grid gap-3 rounded-3xl border bg-card p-5 sm:grid-cols-2">
              <Input
                value={project.title}
                onChange={e =>
                  setProject({ ...project, title: e.target.value })
                }
                placeholder="Project title"
              />
              <Input
                value={project.category}
                onChange={e =>
                  setProject({ ...project, category: e.target.value })
                }
                placeholder="Category"
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-muted p-3 text-sm font-semibold">
                <FileImage size={17} className="text-primary" />{" "}
                {project.coverDataUrl ? "Image selected" : "Import cover image"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 8 * 1024 * 1024)
                      return toast.error("Images must be 8MB or smaller");
                    const reader = new FileReader();
                    reader.onload = () =>
                      setProject({
                        ...project,
                        coverDataUrl: String(reader.result),
                        coverUrl: "",
                      });
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {project.coverDataUrl && (
                <img
                  src={project.coverDataUrl}
                  alt="Portfolio preview"
                  className="h-28 w-full rounded-xl object-cover sm:col-span-2"
                />
              )}
              <Textarea
                className="sm:col-span-2"
                value={project.description}
                onChange={e =>
                  setProject({ ...project, description: e.target.value })
                }
                placeholder="What did you make and why?"
              />
              <div className="flex gap-2 sm:col-span-2">
                <Button
                  onClick={() =>
                    saveProject.mutate({
                      ...(editingProject ? { id: editingProject } : {}),
                      ...project,
                    })
                  }
                  disabled={saveProject.isPending}
                  className="rounded-xl"
                >
                  Save project
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingProject(undefined)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.portfolio?.length ? (
            data.portfolio.map((item: any) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-3xl border bg-card"
              >
                <div className="h-36 bg-gradient-to-br from-primary/80 via-violet-400 to-fuchsia-300" />{" "}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.category || "Selected work"}
                      </p>
                    </div>
                    {ownProfile && (
                      <div className="flex gap-1">
                        <button
                          className="rounded-lg p-2 text-xs text-primary hover:bg-secondary"
                          onClick={() => editProject(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-lg p-2 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => removeProject.mutate({ id: item.id })}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No portfolio projects published yet.
            </div>
          )}
        </div>
        {data.accountType === "designer" && (
          <>
            <button
              onClick={() => setAvailabilityOpen(v => !v)}
              className="mt-10 flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left"
            >
              <div>
                <h2 className="font-[Manrope] text-xl font-extrabold">
                  Availability
                </h2>
                <p className="text-sm text-muted-foreground">
                  {data.availability || "Available"} · tap to{" "}
                  {availabilityOpen ? "collapse" : "edit"}
                </p>
              </div>
              <ChevronRight
                className={`transition-transform ${availabilityOpen ? "rotate-90" : ""}`}
              />
            </button>
            {availabilityOpen && (
              <div className="mt-3 grid gap-2 rounded-3xl border bg-card p-4">
                {ownProfile && (
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/60 p-3">
                    <span className="text-sm font-bold">
                      Set your availability
                    </span>
                    <select
                      className="h-10 min-w-[180px] flex-1 rounded-xl border bg-background px-3 text-sm"
                      value={form.availability}
                      disabled={update.isPending}
                      onChange={e => {
                        const nextForm = {
                          ...form,
                          availability: e.target.value,
                        };
                        setForm(nextForm);
                        update.mutate({
                          ...nextForm,
                          avatarDataUrl: undefined,
                        });
                      }}
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </div>
                )}
                {days.map((day, dayOfWeek) => {
                  const slot = data.availabilitySlots?.find?.(
                    (s: any) => s.dayOfWeek === dayOfWeek
                  );
                  return (
                    <div
                      key={day}
                      className="grid items-center gap-2 sm:grid-cols-[100px_1fr_1fr_auto] sm:gap-3"
                    >
                      <span className="text-sm font-semibold">{day}</span>
                      <Input
                        type="time"
                        defaultValue={slot?.startTime || "09:00"}
                        id={`start-${dayOfWeek}`}
                      />
                      <Input
                        type="time"
                        defaultValue={slot?.endTime || "17:00"}
                        id={`end-${dayOfWeek}`}
                      />
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          const start = (
                            document.getElementById(
                              `start-${dayOfWeek}`
                            ) as HTMLInputElement
                          ).value;
                          const end = (
                            document.getElementById(
                              `end-${dayOfWeek}`
                            ) as HTMLInputElement
                          ).value;
                          saveSlot.mutate({
                            dayOfWeek,
                            startTime: start,
                            endTime: end,
                            enabled: true,
                          });
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {/* availability editor closes above */}
          </>
        )}
        <div className="mt-10">
          <div className="flex items-center gap-2">
            <h2 className="font-[Manrope] text-2xl font-extrabold">Reviews</h2>
          </div>
          <div className="mt-4 space-y-3">
            {data.reviews?.length ? (
              data.reviews.map((review: any) => (
                <div key={review.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} size={14} className="fill-current" />
                    ))}
                  </div>
                  <p className="mt-2 text-sm leading-6">{review.body}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                No reviews yet. Completed projects can receive one client
                review.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function LegalView({
  kind,
  onBack,
}: {
  kind: "about" | "privacy" | "cookies" | "terms";
  onBack: () => void;
}) {
  const content = trpc.content.get.useQuery({ key: `legal.${kind}` });
  const docs = {
    about: [
      "About Gridora",
      "Gridora connects clients with designers for thoughtful, professional creative work. Discover talent, build trusted connections, collaborate privately, and grow a creative community.",
      "Version 1.0 · Built for creative connections",
    ],
    privacy: [
      "Privacy Policy",
      "Gridora stores account, profile, message, notification, and uploaded-file data needed to provide the platform. Messages and files are available only to authorized conversation members. We use authentication cookies and local preferences. You may request correction or deletion of your account data through support.",
    ],
    cookies: [
      "Cookie Policy",
      "Gridora uses necessary session cookies for authentication and secure access, plus local preferences for the application experience. We do not use cookies for unrelated advertising. Analytics, if enabled later, will be disclosed here.",
    ],
    terms: [
      "Terms of Service",
      "Use Gridora lawfully and respectfully. Keep your account secure, only upload content you have rights to use, and do not misuse private conversations, community tools, or other users’ information. Gridora may moderate content that violates these terms.",
    ],
  }[kind];
  return (
    <div className="container max-w-3xl py-6 lg:py-10">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-primary"
      >
        <ChevronLeft size={16} /> Back to settings
      </button>
      <div className="rounded-[2rem] border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">
          Gridora information
        </p>
        <h1 className="mt-2 font-[Manrope] text-3xl font-extrabold">
          {docs[0]}
        </h1>
        <p className="mt-6 whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
          {content.data?.value || docs[1]}
        </p>
        <p className="mt-8 rounded-2xl bg-secondary p-4 text-xs font-semibold text-secondary-foreground">
          {docs[2]}
        </p>
      </div>
    </div>
  );
}
function NotificationsView({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate: (type: string, id: number) => void;
}) {
  const list = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 4000,
    retry: false,
  });
  const markOne = trpc.notifications.markOne.useMutation({
    onSuccess: () => list.refetch(),
  });
  const icon = (kind: string) =>
    kind === "connection" ? (
      <Users size={18} />
    ) : kind === "review" ? (
      <Star size={18} />
    ) : kind === "message" ? (
      <MessageCircle size={18} />
    ) : (
      <Bell size={18} />
    );
  return (
    <div className="container max-w-3xl py-6 lg:py-10">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="rounded-xl p-2 hover:bg-muted">
          <ChevronLeft />
        </button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">
            Live updates
          </p>
          <h1 className="font-[Manrope] text-3xl font-extrabold">
            Notifications
          </h1>
        </div>
      </div>
      <div className="space-y-3">
        {list.isLoading ? (
          <Loader2 className="mx-auto animate-spin" />
        ) : list.data?.length ? (
          list.data.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (!item.readAt) markOne.mutate({ id: item.id });
                if (item.targetType && item.targetId)
                  onNavigate(item.targetType, item.targetId);
              }}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-primary/50 ${item.readAt ? "bg-card" : "border-primary/40 bg-secondary/30"}`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                {icon(item.kind)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6">{item.body}</p>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt="Announcement"
                    className="mt-2 max-h-48 w-full rounded-xl object-cover"
                  />
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              {!item.readAt && (
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </button>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed p-10 text-center">
            <Bell className="mx-auto mb-3 text-primary" />
            <p className="font-bold">You’re all caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New connection, message, project, and community updates will
              appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
function SettingsView({
  user,
  logout,
  onNavigate,
}: {
  user: any;
  logout: () => Promise<void>;
  onNavigate: (type: string, id: number) => void;
}) {
  const [view, setView] = useState<
    "settings" | "notifications" | "about" | "privacy" | "cookies" | "terms"
  >("settings");
  const notifications = trpc.notifications.unread.useQuery(undefined, {
    retry: false,
    refetchInterval: 5000,
  });
  if (view === "notifications")
    return (
      <NotificationsView
        onBack={() => setView("settings")}
        onNavigate={onNavigate}
      />
    );
  if (view !== "settings")
    return <LegalView kind={view} onBack={() => setView("settings")} />;
  return (
    <div className="container max-w-3xl py-6 lg:py-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">
        Workspace
      </p>
      <h1 className="font-[Manrope] text-3xl font-extrabold">Settings</h1>
      <div className="mt-8 space-y-3">
        <div className="flex items-center gap-4 rounded-3xl border bg-card p-5">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.phone}</p>
          </div>
          <ChevronRight className="text-muted-foreground" />
        </div>
        <button
          onClick={() => setView("notifications")}
          className="flex w-full items-center gap-4 rounded-3xl border bg-card p-5 text-left hover:border-primary/50"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
            <Bell size={18} />
          </div>
          <div className="flex-1">
            <p className="font-bold">Notifications</p>
            <p className="text-sm text-muted-foreground">
              Live connection and project updates
            </p>
          </div>
          <span className="rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
            {notifications.data?.length || 0}
          </span>
        </button>
        <div className="rounded-3xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-3">
            <Info className="text-primary" />
            <p className="font-bold">About & legal</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => setView("about")}
              className="rounded-xl bg-muted p-3 text-left text-sm font-semibold"
            >
              About Gridora
            </button>
            <button
              onClick={() => setView("privacy")}
              className="rounded-xl bg-muted p-3 text-left text-sm font-semibold"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setView("cookies")}
              className="rounded-xl bg-muted p-3 text-left text-sm font-semibold"
            >
              Cookie Policy
            </button>
            <button
              onClick={() => setView("terms")}
              className="rounded-xl bg-muted p-3 text-left text-sm font-semibold"
            >
              Terms of Service
            </button>
          </div>
        </div>
        {user.role === "admin" && (
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-2xl border-primary/30 text-primary"
            onClick={() => {
              window.location.href = "/admin";
            }}
          >
            <CircleUserRound size={18} /> Open protected admin dashboard
          </Button>
        )}
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-4 rounded-3xl border border-destructive/20 bg-card p-5 text-left text-destructive"
        >
          <LogOut size={19} />
          <span className="font-bold">Log out of Gridora</span>
        </button>
      </div>
    </div>
  );
}

function GridoraAiWidget() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [newThread, setNewThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [memoryDraft, setMemoryDraft] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threads = trpc.gridoraAI.threads.useQuery(undefined, {
    enabled: open,
    retry: false,
  });
  const messages = trpc.gridoraAI.messages.useQuery(
    { threadId: threadId ?? 0 },
    { enabled: open && Boolean(threadId), retry: false }
  );
  const memory = trpc.gridoraAI.memory.useQuery(undefined, {
    enabled: open,
    retry: false,
  });
  const send = trpc.gridoraAI.send.useMutation({
    onSuccess: result => {
      setThreadId(result.threadId);
      setNewThread(false);
      setDraft("");
      setImageDataUrl("");
      void threads.refetch();
      if (result.threadId === threadId) void messages.refetch();
      else
        void utils.gridoraAI.messages.invalidate({ threadId: result.threadId });
    },
    onError: error => toast.error(error.message),
  });
  const saveMemory = trpc.gridoraAI.saveMemory.useMutation({
    onSuccess: () => {
      toast.success("Gridora AI design notes saved for your account");
      void memory.refetch();
      setMemoryDraft(null);
    },
    onError: error => toast.error(error.message),
  });
  useEffect(() => {
    if (!threadId && !newThread && threads.data?.length)
      setThreadId(threads.data[0].id);
  }, [threadId, newThread, threads.data]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.data?.length, open]);
  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      toast.error("Choose a PNG, JPG, or WebP image");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be 5MB or smaller");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if ((!draft.trim() && !imageDataUrl) || send.isPending) return;
    send.mutate({
      ...(threadId && !newThread ? { threadId } : {}),
      message:
        draft.trim() || "Please give me graphic-design feedback on this image.",
      ...(imageDataUrl ? { imageDataUrl } : {}),
    });
  };
  const currentMemory = memoryDraft ?? memory.data?.designMemory ?? "";
  return (
    <>
      {open && (
        <section
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-50 flex w-[min(94vw,25rem)] flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl sm:right-5"
          style={{
            maxHeight: "calc(100dvh - 7.5rem - env(safe-area-inset-bottom))",
            height: "min(34rem, 72dvh)",
          }}
          aria-label="Gridora AI chat"
        >
          <header className="flex shrink-0 items-center gap-3 border-b p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">Gridora AI</h2>
              <p className="text-[11px] text-muted-foreground">
                Your graphic-design partner
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-xs font-semibold text-primary hover:bg-secondary"
              onClick={() => {
                setThreadId(null);
                setNewThread(true);
              }}
            >
              New chat
            </button>
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-muted"
              onClick={() => setOpen(false)}
              aria-label="Close Gridora AI"
            >
              <X size={17} />
            </button>
          </header>
          <div className="shrink-0 border-b px-3 py-2">
            <label className="sr-only" htmlFor="gridora-ai-threads">
              Saved Gridora AI conversations
            </label>
            <select
              id="gridora-ai-threads"
              className="h-9 w-full rounded-xl border bg-background px-3 text-xs"
              value={newThread ? "new" : threadId ? String(threadId) : ""}
              onChange={event => {
                if (event.target.value === "new") {
                  setThreadId(null);
                  setNewThread(true);
                } else {
                  setThreadId(Number(event.target.value) || null);
                  setNewThread(false);
                }
              }}
            >
              <option value="" disabled>
                {threads.isLoading
                  ? "Loading your conversations…"
                  : "Choose a conversation"}
              </option>
              <option value="new">New conversation</option>
              {threads.data?.map(thread => (
                <option key={thread.id} value={String(thread.id)}>
                  {thread.title}
                </option>
              ))}
            </select>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
            {memoryDraft !== null && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <label
                  className="text-xs font-semibold"
                  htmlFor="gridora-ai-memory"
                >
                  Your private design notes
                </label>
                <Textarea
                  id="gridora-ai-memory"
                  className="mt-2 min-h-20 text-xs"
                  maxLength={2000}
                  value={memoryDraft}
                  onChange={event => setMemoryDraft(event.target.value)}
                  placeholder="Styles, colors, fonts or ongoing design goals you want Gridora AI to remember…"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMemoryDraft(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={saveMemory.isPending}
                    onClick={() =>
                      saveMemory.mutate({ designMemory: memoryDraft })
                    }
                  >
                    Save notes
                  </Button>
                </div>
              </div>
            )}
            {messages.isLoading && threadId ? (
              <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 size={15} className="animate-spin" /> Loading your
                saved chat…
              </div>
            ) : messages.data?.length ? (
              messages.data.map(message => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-sm ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                >
                  {message.content &&
                    (message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{message.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ))}
                  {message.imageUrl && (
                    <img
                      src={message.imageUrl}
                      alt={
                        message.role === "assistant"
                          ? "Gridora AI edited design"
                          : "Image shared with Gridora AI"
                      }
                      className="mt-2 max-h-52 w-full rounded-xl object-contain"
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center">
                <Sparkles className="mb-2 text-primary" size={24} />
                <p className="text-sm font-bold">
                  Design, color, type or image ideas?
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Ask Gridora AI. Your chats and personal design notes are saved
                  to your account.
                </p>
              </div>
            )}
            {send.isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Gridora AI is
                thinking…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {imageDataUrl && (
            <div className="flex shrink-0 items-center gap-2 border-t px-3 pt-2">
              <img
                src={imageDataUrl}
                alt="Image ready to share"
                className="h-12 w-12 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                Image ready — ask for feedback or an edit
              </span>
              <button
                type="button"
                className="rounded-md p-1 hover:bg-muted"
                aria-label="Remove selected image"
                onClick={() => setImageDataUrl("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <form
            onSubmit={submit}
            className="flex shrink-0 items-end gap-2 border-t bg-background/60 p-3"
          >
            <label
              className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border text-muted-foreground hover:bg-muted"
              aria-label="Attach a design image"
            >
              <ImagePlus size={18} />
              <input
                type="file"
                className="sr-only"
                accept="image/png,image/jpeg,image/webp"
                onChange={chooseImage}
              />
            </label>
            <Textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Ask a design question…"
              aria-label="Message Gridora AI"
              className="max-h-24 min-h-10 resize-none text-sm"
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={send.isPending || (!draft.trim() && !imageDataUrl)}
              aria-label="Send to Gridora AI"
            >
              {send.isPending ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <MessageCircle size={17} />
              )}
            </Button>
          </form>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t px-3 py-2 text-[10px] text-muted-foreground">
            <span>Graphic-design help only · private to your account</span>
            <button
              type="button"
              className="shrink-0 font-semibold text-primary hover:underline"
              onClick={() => setMemoryDraft(memory.data?.designMemory ?? "")}
            >
              Design notes
            </button>
          </div>
        </section>
      )}
      <button
        type="button"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition hover:scale-105 active:scale-95"
        onClick={() => setOpen(value => !value)}
        aria-label={open ? "Close Gridora AI" : "Open Gridora AI"}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <Sparkles size={23} />}
      </button>
    </>
  );
}
function AppShell({ user }: { user: any }) {
  const [tab, setTab] = useState<Tab>("chat");
  const [deepChat, setDeepChat] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [logoTaps, setLogoTaps] = useState(0);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [fullChat, setFullChat] = useState(false);
  const { logout } = useAuth();
  const projectDetail = trpc.projects.get.useQuery(
    { id: projectId || 0 },
    { enabled: Boolean(projectId), retry: false }
  );
  const nav = [
    { id: "chat" as const, label: "Chat", icon: MessageCircle },
    { id: "discover" as const, label: "Contact", icon: Compass },
    { id: "settings" as const, label: "Settings", icon: Settings },
    { id: "profile" as const, label: "Profile", icon: UserRound },
  ];
  return (
    <div
      className={`app-shell flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background page-grid ${fullChat ? "" : "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"}`}
    >
      {projectId && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4">
          <section className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-3xl border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Project request
                </p>
                <h2 className="mt-1 font-[Manrope] text-2xl font-extrabold">
                  {projectDetail.data?.title ||
                    (projectDetail.isLoading
                      ? "Loading…"
                      : "Request unavailable")}
                </h2>
              </div>
              <button
                className="rounded-xl p-2 hover:bg-muted"
                onClick={() => setProjectId(null)}
                aria-label="Close project request"
              >
                <X />
              </button>
            </div>
            {projectDetail.data && (
              <>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {projectDetail.data.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-secondary px-3 py-1">
                    {projectDetail.data.service}
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1">
                    {projectDetail.data.status}
                  </span>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {!fullChat && (
        <header className="z-20 shrink-0 border-b bg-background/85 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between">
            <button
              type="button"
              aria-label="Gridora logo"
              onClick={() => {
                const next = advanceAdminShortcutTap(logoTaps);
                setLogoTaps(next.tapCount);
                if (next.openAdmin) window.location.href = "/admin";
              }}
            >
              <Brand />
            </button>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground sm:inline">
                {user.accountType === "designer" ? "Designer" : "Client"}
              </span>
              <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
            </div>
          </div>
        </header>
      )}
      <main className="flex min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === "chat" && (
          <ChatView
            user={user}
            initialChatId={deepChat}
            onFullScreen={setFullChat}
          />
        )}
        {tab === "discover" && (
          <DiscoverView
            onOpenProfile={id => {
              setProfileId(id);
              setTab("profile");
            }}
          />
        )}
        {tab === "profile" && (
          <ProfileView
            user={user}
            profileId={profileId}
            goBack={() => {
              setProfileId(null);
              setTab("discover");
            }}
          />
        )}
        {tab === "settings" && (
          <SettingsView
            user={user}
            logout={logout}
            onNavigate={(type, id) => {
              if (type === "profile") {
                setProfileId(id);
                setTab("profile");
              } else if (type === "chat") {
                setDeepChat(id);
                setTab("chat");
              } else if (type === "project") {
                setProjectId(id);
              }
            }}
          />
        )}
        {!fullChat && <PublicFooter />}
      </main>
      {tab === "chat" && !fullChat && <GridoraAiWidget />}
      {!fullChat && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 shrink-0 border-t bg-card/95 px-2 py-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:static lg:mx-auto lg:mt-6 lg:flex lg:max-w-xl lg:rounded-2xl lg:border lg:px-3 lg:shadow-lg">
          <div className="container flex max-w-xl items-center justify-around p-0">
            {nav.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    if (item.id !== "profile") setProfileId(null);
                  }}
                  className={`flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold transition ${tab === item.id ? "bg-secondary text-primary" : "text-muted-foreground"}`}
                >
                  <Icon size={19} strokeWidth={tab === item.id ? 2.7 : 2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function Home() {
  const { user, loading, isAuthenticated, refresh } = useAuth();
  if (loading)
    return (
      <div className="auth-session-loading grid min-h-[100dvh] place-items-center bg-background page-grid px-6">
        <div
          className="flex flex-col items-center gap-4 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <Loader2
              className="h-6 w-6 animate-spin text-primary"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="font-semibold">Checking your secure session…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Getting Gridora ready for you
            </p>
          </div>
        </div>
      </div>
    );
  if (!isAuthenticated || !user) return <AuthPanel onDone={refresh} />;
  return <AppShell user={user} />;
}
