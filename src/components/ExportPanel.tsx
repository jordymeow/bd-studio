import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Download, Check, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { url } from '../lib/base';

/** Basic JSON syntax highlighting. */
function highlightJson(json: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex =
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|((?:-?\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(json)) !== null) {
    if (match.index > lastIndex) parts.push(json.slice(lastIndex, match.index));
    if (match[1]) {
      parts.push(
        <span key={i++} className="text-accent">
          {match[1]}
        </span>,
      );
      parts.push(': ');
      lastIndex = match.index + match[0].length;
      continue;
    } else if (match[2]) {
      parts.push(
        <span key={i++} className="text-success">
          {match[2]}
        </span>,
      );
    } else if (match[3]) {
      parts.push(
        <span key={i++} className="text-warning">
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={i++} className="text-danger">
          {match[4]}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < json.length) parts.push(json.slice(lastIndex));
  return parts;
}

export default function ExportPanel() {
  const [jsonData, setJsonData] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchExport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url('/api/export'));
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      setJsonData(JSON.stringify(data, null, 2));
    } catch {
      setJsonData('{"error": "Failed to fetch export data"}');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExport();
  }, [fetchExport]);

  const filename = 'bd-editor-backup.json';

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(jsonData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [jsonData]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }, [jsonData]);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.settings || !Array.isArray(parsed.chapters) || !Array.isArray(parsed.characters)) {
        setImportError('Invalid format: file must contain settings, chapters, characters');
        return;
      }
      const counts = `${parsed.chapters.length} chapter(s), ${parsed.characters.length} character(s)`;
      if (!confirm(`Import will REPLACE all existing data with: ${counts}. Continue?`)) return;

      setImporting(true);
      const res = await fetch(url('/api/import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Import failed');
      }
      window.location.reload();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
      setImporting(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <div className="mb-3">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">Backup</h3>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handleImportClick} disabled={importing}>
            <Upload size={14} /> {importing ? 'Restoring…' : 'Restore from JSON'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileSelected}
            className="hidden"
          />
          <span className="text-xs text-text-muted">Replaces all existing data</span>
        </div>
        {importError && <p className="text-xs text-danger mt-2">{importError}</p>}
      </div>

      <div>
        <div className="mb-3">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">Export</h3>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" onClick={copyToClipboard} disabled={!jsonData || loading}>
            {copied ? (
              <>
                <Check size={14} /> Copied
              </>
            ) : (
              <>
                <Copy size={14} /> Copy
              </>
            )}
          </Button>
          <Button variant="secondary" size="sm" onClick={downloadJson} disabled={!jsonData || loading}>
            <Download size={14} /> Download
          </Button>
          <span className="text-xs text-text-muted ml-2">{filename}</span>
        </div>

        <div className="relative rounded-md border border-border overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg/80 z-10">
              <span className="text-text-muted text-sm">Loading...</span>
            </div>
          )}
          <pre className="p-4 text-xs leading-relaxed overflow-auto max-h-[60vh] text-text-muted">
            {jsonData ? highlightJson(jsonData) : 'No data to display'}
          </pre>
        </div>
      </div>
    </div>
  );
}
