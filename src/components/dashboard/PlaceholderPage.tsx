export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A18", margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 14, color: "#6B6B6B", marginTop: 8 }}>
        This module is under development.
      </p>

      <div
        style={{
          marginTop: 24,
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E2DB",
          borderRadius: 10,
          padding: "20px 24px",
        }}
      >
        <p style={{ fontSize: 13, color: "#9A9A9A", margin: 0 }}>
          Content for the {title} module will appear here.
        </p>
      </div>
    </section>
  );
}
