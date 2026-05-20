import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmModal from "../components/ConfirmModal.jsx";

describe("ConfirmModal", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <ConfirmModal open={false} title="Delete?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders title and message when open", () => {
    render(
      <ConfirmModal
        open
        title="Delete guide?"
        message="This cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Delete guide?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal open title="Sure?" confirmText="Yes, Delete" onConfirm={onConfirm} onCancel={vi.fn()} />
    );
    fireEvent.click(screen.getByText("Yes, Delete"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal open title="Sure?" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the X button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open title="Sure?" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByLabelText("Close dialog"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop is clicked", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmModal open title="Sure?" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    // The backdrop is the first fixed div (before the modal wrapper)
    const backdrop = container.querySelector(".fixed.inset-0.bg-black\\/60");
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel on Escape key", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open title="Sure?" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses custom confirmText and cancelText", () => {
    render(
      <ConfirmModal
        open
        title="X"
        confirmText="Proceed"
        cancelText="Go Back"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Proceed")).toBeInTheDocument();
    expect(screen.getByText("Go Back")).toBeInTheDocument();
  });
});
