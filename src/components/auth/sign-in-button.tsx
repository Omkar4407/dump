import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <form
      action={async () => {
        "use server";

        await signIn("google", {
          redirectTo: "/vault",
        });
      }}
    >
      <Button type="submit" size="lg">
        Continue with Google
      </Button>
    </form>
  );
}