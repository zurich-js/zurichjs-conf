/**
 * Speaker Avatar Component
 * Avatar with initials fallback for speaker display
 */

interface SpeakerAvatarProps {
  speaker?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  size?: 'sm' | 'md';
}

export function SpeakerAvatar({ speaker, size = 'md' }: SpeakerAvatarProps) {
  const initials = speaker
    ? `${speaker.first_name?.[0] || ''}${speaker.last_name?.[0] || ''}`.toUpperCase() || '?'
    : '?';
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';

  if (speaker?.avatar_url) {
    return (
      <img
        src={speaker.avatar_url}
        alt={`${speaker.first_name || ''} ${speaker.last_name || ''}`}
        className={`${sizeClasses} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-[#F1E271] to-[#e8d95e] flex items-center justify-center font-semibold text-black flex-shrink-0`}>
      {initials}
    </div>
  );
}
