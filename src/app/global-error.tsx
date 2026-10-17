"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div>
          <h1>OrbitCRM hit an unexpected error</h1>
          <p style={{ color: "#676879" }}>Please refresh the page. If it keeps happening, the server may be restarting.</p>
          <button onClick={() => reset()} style={{ padding: "10px 18px", borderRadius: 10, border: 0, background: "#6161ff", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
