interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  id?: string;
}

/**
 * An accessible iOS-style toggle switch used for match settings such as
 * Golden Point and Tiebreak.
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4"
    >
      <span className="flex flex-col">
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {label}
        </span>
        {description && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </span>
        )}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full
          transition-colors duration-200 focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
          focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950
          ${checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md
            transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </label>
  );
}
