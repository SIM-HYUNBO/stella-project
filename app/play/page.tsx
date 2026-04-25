"use client";

export default function PlaymobilPage() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <iframe
        src="/playmobil_v5.html"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
      />
    </div>
  );
}