/**
 * Share Link Section Component
 * Generate and copy secure share links for reviewers
 */

import React, { useState } from 'react';
import { Loader2, Link2, Copy, Check as CheckIcon } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { createShareLink } from '@/lib/cfp/adminApi';

interface ShareLinkSectionProps {
  submissionId: string;
}

export function ShareLinkSection({ submissionId }: ShareLinkSectionProps) {
  const toast = useToast();
  const [shareNote, setShareNote] = useState('');
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  const shareLinkMutation = useMutation({
    mutationFn: (note?: string) => createShareLink(submissionId, note),
    onSuccess: (data) => {
      setGeneratedShareUrl(data.url);
      toast.success('Share link generated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleGenerateShareLink = async () => {
    await shareLinkMutation.mutateAsync(shareNote || undefined);
  };

  const copyShareLink = () => {
    if (!generatedShareUrl) return;
    navigator.clipboard.writeText(generatedShareUrl);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <h4 className="text-xs font-bold text-black uppercase tracking-wide flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-gray-600" />
        Share with Reviewer
      </h4>
      <p className="text-xs text-gray-500 mb-4">
        Generate a secure link to share this submission with a reviewer. The reviewer must be authenticated to view it. The link reveals the full submission including speaker identity.
      </p>
      <div className="space-y-3">
        <div>
          <label htmlFor="share-note" className="text-xs font-semibold text-black block mb-1">
            Note (optional)
          </label>
          <input
            id="share-note"
            type="text"
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
            placeholder="e.g. Shortlisted for acceptance — please review speaker background"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
          />
        </div>
        <button
          onClick={handleGenerateShareLink}
          disabled={shareLinkMutation.isPending}
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
        >
          {shareLinkMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          Generate Share Link
        </button>
        {generatedShareUrl && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-black">Share Link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-100 px-2 py-1.5 rounded break-all text-gray-700">
                {generatedShareUrl}
              </code>
              <button
                onClick={copyShareLink}
                className="flex-shrink-0 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-1"
              >
                {shareLinkCopied ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Send this link to a reviewer. They must log in to view the submission.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
