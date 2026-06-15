import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UnverifiedBanner from "../components/UnverifiedBanner.jsx";

// ── Mock dependencies ──────────────────────────────────────────────────────────
vi.mock("../contexts/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));
vi.mock("../contexts/ToastContext.jsx", () => ({
  useToast: () => vi.fn(),
}));
vi.mock("../api.js", () => ({
  api: {
    auth: {
      resendVerification: vi.fn(),
    },
  },
}));

import { useAuth } from "../contexts/AuthContext.jsx";
import { api } from "../api.js";

describe("UnverifiedBanner", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders nothing when user is null (logged out)", () => {
    useAuth.mockReturnValue({ user: null });
    const { container } = render(<UnverifiedBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when email_verified is 1 (already verified)", () => {
    useAuth.mockReturnValue({ user: { email_verified: 1, email: "a@b.com" } });
    const { container } = render(<UnverifiedBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when email_verified is undefined (legacy account)", () => {
    useAuth.mockReturnValue({ user: { email: "a@b.com" } });
    const { container } = render(<UnverifiedBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders banner when email_verified is 0", () => {
    useAuth.mockReturnValue({ user: { email_verified: 0, email: "a@b.com" } });
    render(<UnverifiedBanner />);
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByText(/resend/i)).toBeInTheDocument();
  });

  it("dismisses the banner when X is clicked", () => {
    useAuth.mockReturnValue({ user: { email_verified: 0, email: "a@b.com" } });
    render(<UnverifiedBanner />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText(/verify your email/i)).not.toBeInTheDocument();
  });

  it("calls resendVerification when Resend is clicked", async () => {
    api.auth.resendVerification.mockResolvedValue({ success: true });
    useAuth.mockReturnValue({ user: { email_verified: 0, email: "a@b.com" } });
    render(<UnverifiedBanner />);
    fireEvent.click(screen.getByText(/resend/i));
    await waitFor(() => {
      expect(api.auth.resendVerification).toHaveBeenCalledTimes(1);
    });
  });

  it("shows 'Sent!' after successful resend", async () => {
    api.auth.resendVerification.mockResolvedValue({ success: true });
    useAuth.mockReturnValue({ user: { email_verified: 0, email: "a@b.com" } });
    render(<UnverifiedBanner />);
    fireEvent.click(screen.getByText(/resend/i));
    await waitFor(() => {
      expect(screen.getByText("Sent!")).toBeInTheDocument();
    });
  });

  it("dismisses the banner when SMTP is not configured (EMAIL_NOT_CONFIGURED error)", async () => {
    api.auth.resendVerification.mockRejectedValue(new Error("Email service is not configured."));
    useAuth.mockReturnValue({ user: { email_verified: 0, email: "a@b.com" } });
    render(<UnverifiedBanner />);
    fireEvent.click(screen.getByText(/resend/i));
    await waitFor(() => {
      expect(screen.queryByText(/verify your email/i)).not.toBeInTheDocument();
    });
  });
});
