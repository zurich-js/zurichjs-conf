/**
 * Social Links Card - Social profile inputs
 */

import { Github, Linkedin, ExternalLink } from 'lucide-react';
import type { ProfileFormProps } from './types';

/**
 * Extract just the handle from a full URL or stored value.
 * Strips leading @ and known URL prefixes.
 * e.g. "https://github.com/myhandle" -> "myhandle"
 * e.g. "@https://x.com/myhandle" -> "myhandle"
 */
export function extractHandle(value: string, urlPrefixes: string[]): string {
  if (!value) return '';
  let v = value.trim();
  // Strip leading @ symbols (handles may be stored as @handle or @url)
  while (v.startsWith('@')) v = v.slice(1);
  // Try each URL prefix (with and without www.)
  for (const prefix of urlPrefixes) {
    if (v.startsWith(prefix)) return v.slice(prefix.length).replace(/^@/, '').replace(/\/+$/, '');
    const wwwPrefix = prefix.replace('://', '://www.');
    if (v.startsWith(wwwPrefix)) return v.slice(wwwPrefix.length).replace(/^@/, '').replace(/\/+$/, '');
  }
  // Fallback: extract path from any remaining URL
  if (v.startsWith('http')) {
    try {
      const path = new URL(v).pathname.replace(/^\/+@?/, '').replace(/\/+$/, '');
      if (path) return path;
    } catch { /* fall through */ }
  }
  return v;
}

export function SocialLinksCard({ formData, errors, handleChange }: ProfileFormProps) {
  return (
    <div className="bg-brand-gray-dark rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-2">
        Social links<span className="text-red-400">*</span>
      </h3>
      <p className="text-sm text-brand-gray-light mb-4">
        Add <strong className="text-white">at least one social profile</strong> so attendees can follow or connect with you.
      </p>

      <div className="space-y-4">
        {/* GitHub */}
        <SocialInput
          id="github_url"
          label="GitHub"
          icon={<Github className="w-4 h-4 text-brand-gray-light" />}
          value={extractHandle(formData.github_url || '', ['https://github.com/'])}
          onChange={(v) => handleChange('github_url', v)}
          placeholder="myhandle"
          error={errors.github_url}
          linkPrefix="https://github.com/"
          inputPrefix="github.com/"
        />

        {/* LinkedIn */}
        <SocialInput
          id="linkedin_url"
          label="LinkedIn"
          icon={<Linkedin className="w-4 h-4 text-brand-gray-light" />}
          value={extractHandle(formData.linkedin_url || '', ['https://linkedin.com/in/'])}
          onChange={(v) => handleChange('linkedin_url', v)}
          placeholder="myhandle"
          error={errors.linkedin_url}
          linkPrefix="https://linkedin.com/in/"
          inputPrefix="linkedin.com/in/"
        />

        {/* X.com / Twitter */}
        <SocialInput
          id="twitter_handle"
          label="X.com"
          icon={<XIcon />}
          value={extractHandle(formData.twitter_handle || '', ['https://x.com/', 'https://twitter.com/'])}
          onChange={(v) => handleChange('twitter_handle', v)}
          placeholder="myhandle"
          inputPrefix="@"
        />

        {/* Bluesky */}
        <SocialInput
          id="bluesky_handle"
          label="Bluesky"
          icon={<BlueskyIcon />}
          value={extractHandle(formData.bluesky_handle || '', ['https://bsky.app/profile/'])}
          onChange={(v) => handleChange('bluesky_handle', v)}
          placeholder="myhandle"
          inputPrefix="@"
        />

        {/* Mastodon */}
        <SocialInput
          id="mastodon_handle"
          label="Mastodon"
          icon={<MastodonIcon />}
          value={extractHandle(formData.mastodon_handle || '', [])}
          onChange={(v) => handleChange('mastodon_handle', v)}
          placeholder="myhandle"
          inputPrefix="@"
        />
      </div>
    </div>
  );
}

interface SocialInputProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  linkPrefix?: string;
  inputPrefix?: string;
}

function SocialInput({ id, label, icon, value, onChange, placeholder, error, linkPrefix, inputPrefix }: SocialInputProps) {
  const showLink = value && linkPrefix;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-white mb-2">{label}</label>
      <div className="flex items-center bg-brand-gray-darkest rounded-lg border border-brand-gray-medium focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-transparent transition-all">
        <div className="flex items-center gap-1.5 pl-3 shrink-0">
          {icon}
          {inputPrefix && <span className="text-brand-gray-medium text-xs whitespace-nowrap">{inputPrefix}</span>}
        </div>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-white placeholder:text-brand-gray-medium py-3 pl-1.5 pr-4 focus:outline-none text-sm"
        />
        {showLink && (
          <a
            href={value.startsWith('http') ? value : `${linkPrefix}${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pr-3 flex items-center text-brand-gray-light hover:text-white transition-colors shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 text-brand-gray-light" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function BlueskyIcon() {
  return (
    <svg className="w-4 h-4 text-brand-gray-light" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
    </svg>
  );
}

function MastodonIcon() {
  return (
    <svg className="w-4 h-4 text-brand-gray-light" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.668 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" />
    </svg>
  );
}
