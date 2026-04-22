import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Card,
  CardSubtitle,
  CardTitle,
  Field,
  FieldRow,
  IconAction,
  OutlineAddButton,
  PrimaryButton,
  TextField,
} from "./primitives";

type Location = {
  id: string;
  name: string;
  address: string;
  nearbyCompetitors: string;
  observations: number;
};

const INITIAL_LOCATIONS: Location[] = [
  {
    id: "1",
    name: "Snoonu HQ",
    address: "Lusail, Marina District, Qatar",
    nearbyCompetitors: "Lulu Lusail, Carrefour Lusail",
    observations: 23,
  },
  {
    id: "2",
    name: "Doha Festival City Partner Zone",
    address: "Doha Festival City, Umm Salal, Qatar",
    nearbyCompetitors: "Carrefour DFC, Lulu DFC",
    observations: 18,
  },
  {
    id: "3",
    name: "Mall of Qatar Pickup Point",
    address: "Mall of Qatar, Al Rayyan, Qatar",
    nearbyCompetitors: "Carrefour MOQ",
    observations: 12,
  },
  {
    id: "4",
    name: "Al Wakrah Service Center",
    address: "Al Wakrah, Qatar",
    nearbyCompetitors: "Lulu Al Wakrah",
    observations: 7,
  },
];

type EditorState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; id: string };

export function LocationsTab() {
  const [locations, setLocations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [confirmDelete, setConfirmDelete] = useState<Location | null>(null);

  const max = locations.length
    ? Math.max(...locations.map((l) => l.observations), 1)
    : 1;

  const handleSave = (data: Omit<Location, "id" | "observations"> & { observations: number }) => {
    if (editor.mode === "add") {
      setLocations((prev) => [
        ...prev,
        { ...data, id: crypto.randomUUID() },
      ]);
    } else if (editor.mode === "edit") {
      setLocations((prev) =>
        prev.map((l) => (l.id === editor.id ? { ...l, ...data } : l))
      );
    }
    setEditor({ mode: "closed" });
  };

  const editing =
    editor.mode === "edit"
      ? locations.find((l) => l.id === editor.id) ?? null
      : null;

  return (
    <>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <CardTitle>Your store locations</CardTitle>
            <CardSubtitle>
              Physical locations where you operate and where field agents collect competitor data
            </CardSubtitle>
          </div>
          <OutlineAddButton
            icon={<Plus size={14} strokeWidth={2} />}
            onClick={() => setEditor({ mode: "add" })}
          >
            Add location
          </OutlineAddButton>
        </div>

        <div style={{ marginTop: 8 }}>
          {locations.length === 0 && (
            <div
              style={{
                padding: "32px 0",
                textAlign: "center",
                fontSize: 13,
                color: "#9A9A9A",
              }}
            >
              No locations yet. Add your first one to start tracking nearby competitors.
            </div>
          )}
          {locations.map((l, i) => {
            const isLast = i === locations.length - 1;
            const pct = (l.observations / max) * 100;
            return (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 0",
                  borderBottom: isLast ? "none" : "1px solid #E5E2DB",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{l.name}</div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    <MapPin size={12} color="#9A9A9A" />
                    <span style={{ fontSize: 12, color: "#6B6B6B" }}>{l.address}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 4 }}>
                    Nearby competitors: {l.nearbyCompetitors || "-"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#6B6B6B" }}>
                      {l.observations} observations this month
                    </div>
                    <div
                      style={{
                        width: 60,
                        height: 6,
                        backgroundColor: "#F5F4F1",
                        borderRadius: 3,
                        marginTop: 6,
                        marginLeft: "auto",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          backgroundColor: "#EA580C",
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <IconAction
                      ariaLabel={`Edit ${l.name}`}
                      icon={<Pencil size={14} color="#6B6B6B" />}
                      onClick={() => setEditor({ mode: "edit", id: l.id })}
                    />
                    <IconAction
                      ariaLabel={`Remove ${l.name}`}
                      hoverColor="#EF4444"
                      icon={<Trash2 size={14} color="#9A9A9A" />}
                      onClick={() => setConfirmDelete(l)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {editor.mode !== "closed" && (
        <LocationEditor
          initial={editing}
          title={editor.mode === "add" ? "Add location" : "Edit location"}
          onCancel={() => setEditor({ mode: "closed" })}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteDialog
          location={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            setLocations((prev) => prev.filter((l) => l.id !== confirmDelete.id));
            setConfirmDelete(null);
          }}
        />
      )}
    </>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 15, 14, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          border: "1px solid #E5E2DB",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #E5E2DB",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>{title}</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "inline-flex",
            }}
          >
            <X size={16} color="#6B6B6B" />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function LocationEditor({
  initial,
  title,
  onCancel,
  onSave,
}: {
  initial: Location | null;
  title: string;
  onCancel: () => void;
  onSave: (data: { name: string; address: string; nearbyCompetitors: string; observations: number }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [nearby, setNearby] = useState(initial?.nearbyCompetitors ?? "");
  const [observations, setObservations] = useState(
    initial ? String(initial.observations) : "0"
  );

  const canSave = name.trim().length > 0 && address.trim().length > 0;

  return (
    <ModalShell title={title} onClose={onCancel}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <FieldRow>
          <Field label="Name">
            <TextField value={name} onChange={setName} placeholder="e.g. Snoonu HQ" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Address">
            <TextField
              value={address}
              onChange={setAddress}
              placeholder="Street, district, city"
            />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Nearby competitors">
            <TextField
              value={nearby}
              onChange={setNearby}
              placeholder="Comma-separated, e.g. Lulu Lusail, Carrefour Lusail"
            />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Observations this month">
            <TextField
              value={observations}
              onChange={(v) => setObservations(v.replace(/[^0-9]/g, ""))}
              placeholder="0"
            />
          </Field>
        </FieldRow>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 6,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E2DB",
              color: "#1A1A18",
              fontSize: 13,
              fontWeight: 500,
              padding: "10px 18px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <div style={{ opacity: canSave ? 1 : 0.5, pointerEvents: canSave ? "auto" : "none" }}>
            <PrimaryButton
              onClick={() =>
                onSave({
                  name: name.trim(),
                  address: address.trim(),
                  nearbyCompetitors: nearby.trim(),
                  observations: Number(observations) || 0,
                })
              }
            >
              {initial ? "Save changes" : "Add location"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ConfirmDeleteDialog({
  location,
  onCancel,
  onConfirm,
}: {
  location: Location;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title="Remove location" onClose={onCancel}>
      <div style={{ fontSize: 13, color: "#1A1A18", lineHeight: 1.5 }}>
        Are you sure you want to remove <strong>{location.name}</strong>? Field agents will no
        longer be assigned to this location.
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 18,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            color: "#1A1A18",
            fontSize: 13,
            fontWeight: 500,
            padding: "10px 18px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          style={{
            backgroundColor: "#EF4444",
            border: "none",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 18px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Remove
        </button>
      </div>
    </ModalShell>
  );
}
