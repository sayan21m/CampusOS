import { hashPassword, verifyPassword } from "./password.js";

describe("Password utilities", () => {
    test("should hash and verify a password", async () => {
        const password = "hello123";

        const hash = await hashPassword(password);

        expect(hash).not.toBe(password);

        const valid = await verifyPassword(password, hash);

        expect(valid).toBe(true);
    });

    test("should reject an incorrect password", async () => {
        const password = "hello123";

        const hash = await hashPassword(password);

        const valid = await verifyPassword("wrongpassword", hash);

        expect(valid).toBe(false);
    });
});