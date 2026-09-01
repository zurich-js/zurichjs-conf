import { useState } from 'react';
import { Download, LoaderCircle, QrCode, ShieldCheck } from 'lucide-react';

function fileNameFromDisposition(value: string | null): string {
  const match = value?.match(/filename="([^"]+)"/i);
  return match?.[1] ?? 'zurichjs-badges.zip';
}

export function BadgeExportTab() {
  const [provisionShareIds, setProvisionShareIds] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/badges/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provisionShareIds }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Badge export failed' })) as {
          error?: string;
        };
        throw new Error(body.error ?? 'Badge export failed');
      }

      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileNameFromDisposition(response.headers.get('Content-Disposition'));
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Badge export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-brand-primary/20 p-3">
          <QrCode className="h-6 w-6 text-black" />
        </div>
        <div className="max-w-3xl">
          <h2 className="text-xl font-bold text-gray-900">Illustrator badge export</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Download VIP attendees, other confirmed attendees, sponsors, and the exact public
            speaker lineup as CSV files with QR images and sponsor logos. Hidden and unselected CFP
            applicants are excluded.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" />
          <div>
            <p className="text-sm font-semibold text-green-900">Existing preferences stay unchanged</p>
            <p className="mt-1 text-sm text-green-800">
              Provisioning only inserts missing disabled share IDs. It does not enable profiles or
              overwrite any attendee or sponsor contact settings.
            </p>
          </div>
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={provisionShareIds}
          onChange={(event) => setProvisionShareIds(event.target.checked)}
          className="mt-1 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">
            Provision missing attendee and sponsor share IDs
          </span>
          <span className="mt-1 block text-xs text-gray-600">
            Required for people who have not yet chosen networking visibility.
          </span>
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={downloadExport}
        disabled={isExporting}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isExporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {isExporting ? 'Building archive…' : 'Download badge export'}
      </button>
    </section>
  );
}
