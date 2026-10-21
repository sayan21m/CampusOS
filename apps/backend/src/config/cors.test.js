import {
  allowedFrontendOrigins,
  corsOriginDelegate,
  parseConfiguredOrigins,
  resolvePasswordResetOrigin,
} from "./cors.js";

describe("CORS origin policy", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  test("parses comma-separated FRONTEND_URL values", () => {
    expect(
      parseConfiguredOrigins(" https://campus-os-gilt.vercel.app/ , https://campus.example.edu ")
    ).toEqual(["https://campus-os-gilt.vercel.app", "https://campus.example.edu"]);
  });

  test("always allows local and the production Vercel origin", () => {
    const allowed = allowedFrontendOrigins("");

    expect(allowed).toContain("http://localhost:5173");
    expect(allowed).toContain("https://campus-os-gilt.vercel.app");
  });

  test("allows configured origins without throwing", () => {
    const decide = corsOriginDelegate(["https://campus-os-gilt.vercel.app"]);

    decide("https://campus-os-gilt.vercel.app", (error, ok) => {
      expect(error).toBeNull();
      expect(ok).toBe(true);
    });
  });

  test("rejects unknown origins without an Error (avoids Express 500)", () => {
    const decide = corsOriginDelegate(["https://campus-os-gilt.vercel.app"]);

    decide("https://evil.example", (error, ok) => {
      expect(error).toBeNull();
      expect(ok).toBe(false);
    });
  });

  test("allows non-browser clients that send no Origin", () => {
    const decide = corsOriginDelegate(["https://campus-os-gilt.vercel.app"]);

    decide(undefined, (error, ok) => {
      expect(error).toBeNull();
      expect(ok).toBe(true);
    });
  });

  test("password-reset links prefer FRONTEND_URL over localhost", () => {
    process.env.NODE_ENV = "production";

    expect(resolvePasswordResetOrigin("https://campus-os-gilt.vercel.app")).toBe(
      "https://campus-os-gilt.vercel.app"
    );
    expect(resolvePasswordResetOrigin("")).toBe("https://campus-os-gilt.vercel.app");
  });
});
