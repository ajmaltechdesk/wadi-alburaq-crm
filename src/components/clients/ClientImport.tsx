"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { bulkCreateClients, fetchClients, fetchUsers, logAudit } from "@/lib/data";
import { downloadClientTemplate, parseClientFile, type ImportResult } from "@/lib/clientImport";
import { Button, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

export function ClientImport({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => { setFile(null); setResult(null); };

  const handleFile = async (f: File) => {
    if (!profile) return;
    setFile(f);
    setResult(null);
    setParsing(true);
    try {
      const [users, existing] = await Promise.all([fetchUsers(), fetchClients("admin", profile.uid)]);
      const parsed = await parseClientFile(f, users, existing, profile);
      setResult(parsed);
      if (parsed.drafts.length === 0) {
        toast.warning("No valid rows found to import. Check the file against the template.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not read that file. Make sure it's a valid .xlsx or .csv from the template.");
      reset();
    } finally {
      setParsing(false);
    }
  };

  const runImport = async () => {
    if (!profile || !result || result.drafts.length === 0) return;
    setImporting(true);
    try {
      const count = await bulkCreateClients(result.drafts);
      await logAudit(profile, "import", "client", undefined, undefined, `${count} clients imported`);
      toast.success(`${count} client${count === 1 ? "" : "s"} imported successfully`);
      onImported();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Import Clients" wide>
      <div className="space-y-5">
        {/* Step 1: template */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/50 p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-success-soft p-2 text-success"><FileSpreadsheet className="size-5" /></span>
            <div>
              <p className="text-sm font-semibold">Step 1 — Download the template</p>
              <p className="text-xs text-fg-muted">Fill in your clients, keeping the column headers unchanged.</p>
            </div>
          </div>
          <Button variant="secondary" onClick={downloadClientTemplate}>
            <Download className="size-4" /> Template (.xlsx)
          </Button>
        </div>

        {/* Step 2: upload */}
        <div>
          <p className="mb-2 text-sm font-semibold">Step 2 — Upload your completed file</p>
          <label className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50",
            parsing && "pointer-events-none opacity-60"
          )}>
            <Upload className="size-6 text-fg-faint" />
            <span className="text-sm font-medium">
              {parsing ? "Reading file…" : file ? file.name : "Click to choose an .xlsx or .csv file"}
            </span>
            <span className="text-xs text-fg-faint">Excel or CSV exported from the template</span>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>

        {/* Step 3: review */}
        {result && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Step 3 — Review</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums text-success">{result.drafts.length}</p>
                <p className="text-xs text-fg-muted">Ready to import</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums text-warning">{result.duplicates}</p>
                <p className="text-xs text-fg-muted">Duplicates skipped</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums text-danger">{result.errors.length}</p>
                <p className="text-xs text-fg-muted">Rows with errors</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft p-3">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-danger">
                  <AlertTriangle className="size-4" /> These rows will be skipped
                </p>
                <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-fg-muted">
                  {result.errors.slice(0, 50).map((e, i) => (
                    <li key={i}>Row {e.row}: {e.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.drafts.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-bold uppercase text-fg-muted">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Mobile</th>
                      <th className="px-3 py-2">Lead Source</th>
                      <th className="px-3 py-2">Assigned To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.drafts.slice(0, 5).map((d, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium">{d.name}</td>
                        <td className="px-3 py-2">{d.mobile}</td>
                        <td className="px-3 py-2 text-fg-muted">{d.leadSource}</td>
                        <td className="px-3 py-2 text-fg-muted">{d.assignedEmployeeName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.drafts.length > 5 && (
                  <p className="border-t border-border px-3 py-2 text-xs text-fg-faint">
                    + {result.drafts.length - 5} more…
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={runImport} loading={importing} disabled={!result || result.drafts.length === 0}>
            <CheckCircle2 className="size-4" />
            Import {result?.drafts.length ? `${result.drafts.length} Clients` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
