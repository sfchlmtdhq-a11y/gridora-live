export type AuthMode = "login" | "register";

export type AuthFormData = {
  name: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  confirm: string;
};

export type AuthField = keyof AuthFormData;
export type AuthFieldFeedback = {
  status: "valid" | "invalid";
  message: string;
};

export function isAuthPasswordEligible(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /\d/.test(password) &&
    /[A-Z]/.test(password)
  );
}

export function getAuthFieldFeedback(
  mode: AuthMode,
  field: AuthField,
  form: AuthFormData,
  includeEmpty = false
): AuthFieldFeedback | null {
  const value = form[field].trim();
  if (!value && !(includeEmpty && field !== "email")) return null;

  let message: string | null = null;
  if (field === "name" && mode === "register") {
    if (value.length < 2) message = "Enter at least 2 characters.";
  } else if (field === "username" && mode === "register") {
    if (!/^[a-zA-Z0-9_]{3,48}$/.test(value))
      message = "Use 3–48 letters, numbers, or underscores.";
  } else if (field === "phone") {
    if (mode === "login") message = null;
    else if (value.length < 7 || value.length > 24)
      message = "Enter 7–24 characters for your phone number.";
  } else if (field === "email" && mode === "register") {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      message = "Enter a valid email address, or leave it blank.";
  } else if (field === "password") {
    if (mode === "login") {
      if (value.length < 8 || value.length > 128)
        message = "Use 8–128 characters for your password.";
    } else if (!isAuthPasswordEligible(form.password)) {
      message =
        "Use 8–128 characters, including an uppercase letter and a number.";
    }
  } else if (field === "confirm" && mode === "register") {
    if (form.password !== form.confirm) message = "Passwords do not match.";
  }

  if (message) return { status: "invalid", message };
  if (!value) return { status: "invalid", message: "This field is required." };
  return { status: "valid", message: "Looks good." };
}

export function validateAuthForm(mode: AuthMode, form: AuthFormData) {
  if (mode === "login") {
    return form.phone.trim() &&
      form.password.length >= 8 &&
      form.password.length <= 128
      ? null
      : "Enter your name, username, phone, or email and password";
  }

  if (form.name.trim().length < 2)
    return "Enter your full name to create an account.";
  if (!/^[a-zA-Z0-9_]{3,48}$/.test(form.username.trim()))
    return "Choose a username with 3–48 letters, numbers, or underscores.";
  if (form.phone.trim().length < 7 || form.phone.trim().length > 24)
    return "Enter a phone number with 7–24 characters.";
  if (
    form.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  )
    return "Enter a valid email address, or leave it blank.";
  if (!isAuthPasswordEligible(form.password))
    return "Meet all password eligibility requirements.";
  if (form.password !== form.confirm)
    return "Passwords do not match. Please check both fields.";
  return null;
}

export function getAuthErrorMessage(mode: AuthMode, message: string) {
  if (/already registered/i.test(message))
    return "That phone number, username, or email is already in use.";
  if (/incorrect name|incorrect.*password/i.test(message))
    return "Those sign-in details did not match. Check them and try again.";
  if (/suspended/i.test(message))
    return "This account is suspended. Contact Gridora support if you think this is a mistake.";
  if (/deleted/i.test(message))
    return "This account is no longer active. Contact Gridora support for help.";
  if (/database is not configured|precondition/i.test(message))
    return "Account services are temporarily unavailable. Please try again shortly.";
  if (/failed to fetch|networkerror|load failed|network request/i.test(message))
    return "Connection interrupted. Check your internet and try again.";
  return mode === "login"
    ? "We couldn't sign you in. Please check your details and try again."
    : "We couldn't create your account. Please review your details and try again.";
}
