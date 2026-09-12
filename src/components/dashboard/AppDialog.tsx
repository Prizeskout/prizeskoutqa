import { useEffect, useRef, useState, type CSSProperties } from "react";

type DialogRequest = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  input?: { label: string; initialValue?: string; placeholder?: string; multiline?: boolean };
};

type PendingDialog = DialogRequest & { resolve: (value: string | boolean | null) => void };

export function useAppDialog() {
  const [pending, setPending] = useState<PendingDialog | null>(null);

  const ask = (request: DialogRequest) =>
    new Promise<string | boolean | null>((resolve) => {
      setPending((current) => {
        current?.resolve(null);
        return { ...request, resolve };
      });
    });

  const confirm = async (request: Omit<DialogRequest, "input">) => (await ask(request)) === true;

  const prompt = async (
    request: DialogRequest & { input: NonNullable<DialogRequest["input"]> },
  ) => {
    const result = await ask(request);
    return typeof result === "string" ? result : null;
  };

  const close = (value: string | boolean | null) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  };

  return {
    confirm,
    prompt,
    dialog: pending ? <AppDialog request={pending} onClose={close} /> : null,
  };
}

function AppDialog({
  request,
  onClose,
}: {
  request: PendingDialog;
  onClose: (value: string | boolean | null) => void;
}) {
  const [value, setValue] = useState(request.input?.initialValue ?? "");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const submit = () => onClose(request.input ? value : true);
  const fieldStyle: CSSProperties = {
    width: "100%",
    minHeight: 44,
    boxSizing: "border-box",
    border: "1px solid var(--border)",
    borderRadius: 9,
    background: "var(--surface)",
    color: "var(--text)",
    padding: "10px 12px",
    font: "inherit",
    outlineOffset: 2,
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(null);
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(9,12,18,.62)",
        backdropFilter: "blur(7px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        style={{
          width: "min(520px,100%)",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          boxShadow: "var(--shadow-lg)",
          padding: "28px 30px",
        }}
      >
        <h2 id="app-dialog-title" style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {request.title}
        </h2>
        {request.message && (
          <p
            style={{
              margin: "10px 0 0",
              color: "var(--muted)",
              fontSize: 14,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {request.message}
          </p>
        )}
        {request.input && (
          <label style={{ display: "grid", gap: 7, marginTop: 20, fontSize: 13, fontWeight: 700 }}>
            {request.input.label}
            {request.input.multiline ? (
              <textarea
                ref={(node) => {
                  inputRef.current = node;
                }}
                value={value}
                placeholder={request.input.placeholder}
                onChange={(event) => setValue(event.target.value)}
                rows={5}
                style={{ ...fieldStyle, minHeight: 112, resize: "vertical" }}
              />
            ) : (
              <input
                ref={(node) => {
                  inputRef.current = node;
                }}
                value={value}
                placeholder={request.input.placeholder}
                onChange={(event) => setValue(event.target.value)}
                style={fieldStyle}
              />
            )}
          </label>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 24,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => onClose(null)}
            style={{
              minHeight: 44,
              padding: "10px 17px",
              borderRadius: 9,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {request.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="submit"
            style={{
              minHeight: 44,
              padding: "10px 17px",
              borderRadius: 9,
              border: 0,
              background: "#EF681A",
              color: "#fff",
              font: "inherit",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {request.confirmLabel ?? (request.input ? "Continue" : "Confirm")}
          </button>
        </div>
      </form>
    </div>
  );
}
