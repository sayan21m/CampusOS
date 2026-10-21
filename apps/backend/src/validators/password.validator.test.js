import { newPasswordSchema } from "./password.validator.js";

describe("newPasswordSchema", () => {
  test("accepts the institutional seed password", () => {
    expect(newPasswordSchema.safeParse("CampusOS@123").success).toBe(true);
  });

  test("rejects short or letter-only passwords", () => {
    expect(newPasswordSchema.safeParse("Ab1").success).toBe(false);
    expect(newPasswordSchema.safeParse("abcdefgh").success).toBe(false);
    expect(newPasswordSchema.safeParse("12345678").success).toBe(false);
  });
});
