export type AuthMode = "login" | "register";

export type AuthFormData = {
  name: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  confirm: string;
};

export function isAuthPasswordEligible(password: string) {
  return password.length >= 8 && /\d/.test(password) && /[A-Z]/.test(password);
}

export function validateAuthForm(mode: AuthMode, form: AuthFormData) {
  if (mode === "login") {
    return form.phone.trim() && form.password.length >= 8
      ? null
      : "Enter your name, username, phone, or email and password";
  }

  if (form.name.trim().length < 2)
    return "Enter your full name to create an account.";
  if (!/^[a-zA-Z0-9_]{3,48}$/.test(form.username.trim()))
    return "Choose a username with 3–48 letters, numbers, or underscores.";
  if (form.phone.trim().length < 7)
    return "Enter a phone number with at least 7 characters.";
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
  if (/database is not configured|precondition/i.test(message))
    return "Account services are temporarily unavailable. Please try again shortly.";
  if (/failed to fetch|networkerror|load failed|network request/i.test(message))
    return "Connection interrupted. Check your internet and try again.";
  return mode === "login"
    ? "We couldn't sign you in. Please check your details and try again."
    : "We couldn't create your account. Please review your details and try again.";
}
