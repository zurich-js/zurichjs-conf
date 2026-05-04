/**
 * ToggleButton
 * Reusable labeled toggle switch for admin panels
 */

interface ToggleButtonProps {
  label: string;
  checked: boolean;
  onClick: () => void;
  disabled: boolean;
  activeClassName: string;
  title: string;
}

export function ToggleButton({
  label,
  checked,
  onClick,
  disabled,
  activeClassName,
  title,
}: ToggleButtonProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? activeClassName : 'bg-gray-300'
        }`}
        title={title}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
