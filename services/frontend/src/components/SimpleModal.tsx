import { createPortal } from "react-dom";
import { useRef } from "react";

export function SimpleModal({
  open,
  onClose,
  children,
  onOverlayClick,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  onOverlayClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const mouseDownTarget = useRef<EventTarget | null>(null);

  if (!open) return null;
  return createPortal(
    <div
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      className="fixed inset-0 flex items-center justify-center z-50"
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      onMouseDown={e => {
        mouseDownTarget.current = e.target;
      }}
      onMouseUp={e => {
        // Only close if both down and up were on the overlay itself
        if (
          mouseDownTarget.current === e.currentTarget &&
          e.target === e.currentTarget
        ) {
          if (onOverlayClick) onOverlayClick(e as any);
          else onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}