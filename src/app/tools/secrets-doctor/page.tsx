"use client";

import { useState } from "react";

type ScanResult = {
  scannedPath: string;
  findings: string[];
  envMissing: string[];
};

export default function SecretsDoctorPage() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runScan = async () => {
    setLoading(true);
    const res = await fetch("/api/secrets-scan", { method: "POST" });
    const json = await res.json();
    setResult(json);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="kicker">Tool</p>
        <h2 className="title-xl mt-1">Secrets & Config Doctor</h2>
      </div>

      <button onClick={runScan} className="btn-primary">
        {loading ? "Scanning..." : "Run Scan"}
      </button>

      {result && (
        <div className="space-y-4">
          <div className="surface p-5">
            <p className="kicker">Scanned path</p>
            <p className="mt-2 text-sm text-black/70">{result.scannedPath}</p>
          </div>

          <div className="surface p-5">
            <h3 className="text-base font-semibold text-black">Potential secret findings</h3>
            {result.findings.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-700">No suspicious matches found.</p>
            ) : (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-amber-700">
                {result.findings.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="surface p-5">
            <h3 className="text-base font-semibold text-black">Missing keys from .env</h3>
            {result.envMissing.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-700">No missing keys detected.</p>
            ) : (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-amber-700">
                {result.envMissing.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
