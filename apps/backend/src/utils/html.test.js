import { escapeHtml } from "./html.js";

describe("escapeHtml", () => {
  test("escapes markup that could execute in HTML email clients", () => {
    expect(escapeHtml(`Ada <img src=x onerror="alert(1)"> & co`)).toBe(
      "Ada &lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; co"
    );
  });

  test("treats nullish values as an empty string", () => {
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(null)).toBe("");
  });
});
