export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include a letter and a number.";

export function isPasswordStrong(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
