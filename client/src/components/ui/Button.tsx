import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-forest text-cream hover:bg-forest/90 disabled:bg-forest/40',
  secondary:
    'bg-leaf text-forest hover:bg-leaf/80 disabled:bg-leaf/40',
  ghost:
    'bg-transparent text-forest border border-forest/30 hover:bg-forest/5 disabled:text-forest/40',
  danger:
    'bg-coral text-white hover:bg-coral/90 disabled:bg-coral/40',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
