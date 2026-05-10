import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-brand text-white shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--color-brand-500)_60%,transparent)] hover:shadow-[0_12px_32px_-12px_color-mix(in_oklab,var(--color-brand-500)_70%,transparent)] active:scale-[0.98]",
        secondary:
          "surface-hover text-[--color-foreground] hover:surface-hover-active",
        ghost:
          "text-[--color-muted] hover:text-[--color-foreground] hover:bg-[--color-surface-2]",
        danger:
          "bg-[--color-accent-red] text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[--radius-sm]",
        md: "h-10 px-4 text-sm rounded-[--radius]",
        lg: "h-12 px-6 text-base rounded-[--radius-md]",
        icon: "size-10 rounded-[--radius]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
