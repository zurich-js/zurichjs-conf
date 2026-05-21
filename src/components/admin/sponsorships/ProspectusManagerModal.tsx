/**
 * Admin modal for replacing the public sponsorship prospectus PDFs.
 */

import { useState } from 'react';
import { Download, Eye, FileText, Trash2, Upload } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminModal } from '@/components/admin/AdminModal';
import { sponsorshipKeys } from '@/lib/query-keys';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ProspectusAsset, ProspectusCategory, ProspectusCurrency } from '@/lib/sponsorship/prospectus';

interface ProspectusManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_PROSPECTUS_FILE_SIZE = 20 * 1024 * 1024;

async function readErrorResponse(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await response.json() as { error?: string };
    return data.error || fallback;
  }

  const text = await response.text();
  return text.trim() || fallback;
}

async function fetchProspectusAssets(): Promise<ProspectusAsset[]> {
  const response = await fetch('/api/admin/sponsorships/prospectus');
  if (!response.ok) throw new Error('Failed to fetch prospectus assets');
  const data = await response.json() as { assets: ProspectusAsset[] };
  return data.assets;
}

async function uploadProspectus(currency: ProspectusCurrency, category: ProspectusCategory, file: File): Promise<void> {
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }

  if (file.size > MAX_PROSPECTUS_FILE_SIZE) {
    throw new Error('PDF must be 20 MB or smaller');
  }

  const response = await fetch(`/api/admin/sponsorships/prospectus/${currency}/${category}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentType: file.type,
      size: file.size,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response, 'Failed to create prospectus upload URL'));
  }

  const upload = await response.json() as { path: string; token: string };
  const supabase = createBrowserClient();
  const { error } = await supabase.storage
    .from('sponsorship-assets')
    .uploadToSignedUrl(upload.path, upload.token, file, {
      contentType: 'application/pdf',
      cacheControl: String(60 * 60),
      upsert: true,
    });

  if (error) {
    throw new Error(error.message || 'Failed to upload prospectus');
  }
}

async function deleteProspectus(currency: ProspectusCurrency, category: ProspectusCategory): Promise<void> {
  const response = await fetch(`/api/admin/sponsorships/prospectus/${currency}/${category}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await readErrorResponse(response, 'Failed to delete prospectus'));
  }
}

function formatBytes(size: number | null): string {
  if (!size) return 'Unknown size';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProspectusManagerModal({ isOpen, onClose }: ProspectusManagerModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: sponsorshipKeys.prospectus(),
    queryFn: fetchProspectusAssets,
    enabled: isOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ currency, category, file }: { currency: ProspectusCurrency; category: ProspectusCategory; file: File }) => uploadProspectus(currency, category, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sponsorshipKeys.prospectus() }),
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to upload prospectus'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ currency, category }: { currency: ProspectusCurrency; category: ProspectusCategory }) => deleteProspectus(currency, category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sponsorshipKeys.prospectus() }),
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to delete prospectus'),
  });

  const byKey = new Map(assets.map((asset) => [`${asset.currency}:${asset.category}`, asset]));
  const categories: ProspectusCategory[] = ['compact', 'full'];
  const currencies: ProspectusCurrency[] = ['CHF', 'EUR', 'GBP', 'USD'];

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Sponsorship Prospectus"
      description="Replace the compact and full public PDF downloads"
      size="2xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading prospectus files...</div>
        ) : (
          currencies.map((currency) => (
            <div key={currency} className="space-y-3 rounded-xl border border-gray-200 p-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{currency} prospectus files</h3>
                <p className="text-xs text-gray-500">PDFs in this currency are shown to sponsors when they select {currency}.</p>
              </div>
              {categories.map((category) => {
                const asset = byKey.get(`${currency}:${category}`);
                const isBusy = uploadMutation.isPending || deleteMutation.isPending;

                return (
                  <div key={category} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold capitalize text-gray-900">{category} prospectus</h3>
                          {asset?.exists ? (
                            <p className="text-xs text-gray-500">
                              {formatBytes(asset.size)}
                              {asset.updatedAt ? ` • Updated ${new Date(asset.updatedAt).toLocaleString()}` : ''}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">No PDF uploaded</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <label
                          className={`inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-medium text-black hover:bg-[#e6d766] ${isBusy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                          <Upload className="h-4 w-4" />
                          {asset?.exists ? 'Replace' : 'Upload'}
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            disabled={isBusy}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = '';
                              if (!file) return;
                              setError(null);
                              uploadMutation.mutate({ currency, category, file });
                            }}
                          />
                        </label>
                        {asset?.exists && (
                          <>
                            <a
                              href={asset.url ?? `/api/sponsorship/prospectus/${currency}/${category}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </a>
                            <a
                              href={`/api/sponsorship/prospectus/${currency}/${category}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                if (window.confirm(`Delete the ${currency} ${category} prospectus PDF?`)) {
                                  setError(null);
                                  deleteMutation.mutate({ currency, category });
                                }
                              }}
                              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </AdminModal>
  );
}
