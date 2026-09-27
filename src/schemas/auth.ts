import { z } from "zod";

// Used for login: only checks shape, not content -- an existing account's password may
// predate the complexity rule below, and login should never reject a correct password.
export const authCredentialsSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
export type AuthCredentials = z.infer<typeof authCredentialsSchema>;

export const PASSWORD_COMPLEXITY_MESSAGE =
  "8+ characters, with an uppercase letter, a lowercase letter, a number, and a special character.";

// Stricter than authCredentialsSchema above -- for setting a new password (sign-up,
// change-password), never for logging in with one that already exists.
export const passwordComplexitySchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[a-z]/, PASSWORD_COMPLEXITY_MESSAGE)
  .regex(/[A-Z]/, PASSWORD_COMPLEXITY_MESSAGE)
  .regex(/[0-9]/, PASSWORD_COMPLEXITY_MESSAGE)
  .regex(/[^A-Za-z0-9]/, PASSWORD_COMPLEXITY_MESSAGE);

export const signUpCredentialsSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: passwordComplexitySchema,
});
export type SignUpCredentials = z.infer<typeof signUpCredentialsSchema>;
