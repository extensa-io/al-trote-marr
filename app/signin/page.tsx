import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function SignIn() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display font-bold text-brass text-4xl mb-2 leading-none">Al Trote Marr!</h1>
      <p className="text-canvas-dim mb-10 text-sm">Your running training plan.</p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="font-display uppercase tracking-widest text-sm bg-brass text-field px-6 py-3 rounded-sm hover:brightness-110 transition"
        >
          Sign in with Google
        </button>
      </form>
      <p className="text-canvas-dim/70 mt-8 text-xs max-w-xs">Access is limited to invited users.</p>
    </main>
  );
}
