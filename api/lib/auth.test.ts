import { beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { profileUser, signToken, verifyToken } from "./auth";

beforeAll(() => { process.env.JWT_SECRET = "test-secret-not-a-real-one"; });

describe("token round-trip", () => {
  it("recovers the user id it signed", () => {
    expect(verifyToken(signToken("user-123"))?.userId).toBe("user-123");
  });

  it("rejects a token signed with a different secret", () => {
    const foreign = jwt.sign({ userId: "user-123" }, "some-other-secret");
    expect(verifyToken(foreign)).toBeNull();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ userId: "user-123" }, process.env.JWT_SECRET!, { expiresIn: "-1s" });
    expect(verifyToken(expired)).toBeNull();
  });

  it("rejects a malformed token instead of throwing", () => {
    expect(verifyToken("not-a-jwt")).toBeNull();
  });
});

describe("profileUser", () => {
  it("never leaks the password hash", () => {
    const out = profileUser({
      id: "u1", email: "a@b.com", passwordHash: "$2a$10$SECRET", fullName: "A B",
      role: "b2c_customer", ordersCount: 0,
    });
    expect(out).not.toHaveProperty("passwordHash");
    expect(out.email).toBe("a@b.com");
  });
});
