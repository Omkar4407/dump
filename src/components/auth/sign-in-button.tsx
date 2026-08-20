import { signIn } from "@/auth";

import { Button } from "@/components/ui/button";

type SignInButtonProps = {
  label?: string;
  size?: "sm" | "lg" | "xl";
  variant?: "default" | "outline" | "lemon" | "mint" | "coral";
  /*
   * Stretches the control — and the form
   * that wraps it — across its container.
   */
  fullWidth?: boolean;
};

export function SignInButton({
  label = "Open your vault",
  size = "lg",
  variant = "default",
  fullWidth = false,
}: SignInButtonProps) {
  return (
    <form
      className={fullWidth ? "w-full" : undefined}
      action={async () => {
        "use server";

        await signIn("google", {
          redirectTo: "/vault",
        });
      }}
    >
      <Button
        type="submit"
        size={size}
        variant={variant}
        className={fullWidth ? "w-full" : undefined}
      >
        {label}
        <span aria-hidden="true">→</span>
      </Button>
    </form>
  );
}
