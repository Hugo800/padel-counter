import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** A rounded, soft-shadowed surface used throughout the app. */
export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div className={`card p-5 ${className}`} {...rest}>
      {children}
    </div>
  );
}
