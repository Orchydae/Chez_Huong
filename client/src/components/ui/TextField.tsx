import type { InputHTMLAttributes, ReactNode } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  hint?: string;
}

export default function TextField({ label, hint, id, className = '', ...props }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium text-forest/80">
        {label}
      </label>
      <input
        id={id}
        {...props}
        // text-base below sm so iOS Safari doesn't auto-zoom the modal on focus
        className={`rounded-lg border border-forest/20 bg-white px-3.5 py-2.5 text-base text-forest outline-none transition focus:border-forest focus:ring-2 focus:ring-leaf/50 sm:text-sm ${className}`}
      />
      {hint && <p className="text-xs text-forest/50">{hint}</p>}
    </div>
  );
}
