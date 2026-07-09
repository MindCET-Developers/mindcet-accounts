import Link from "next/link";
import { SignInWithGoogle } from "@/components/auth/SignInWithGoogle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-[--color-surface] border border-[--color-border-soft] grid place-items-center text-2xl">
              💳
            </div>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-3">
            MindCET Accounts
          </h1>
          <p className="text-[--color-muted]">
            מעקב הוצאות וחשבוניות <br />
            לכל הצוות, במקום אחד.
          </p>
        </div>

        <div className="surface p-8">
          <SignInWithGoogle />

          {error && (
            <div className="mt-4 rounded-[--radius] border border-[--color-accent-red]/30 bg-[--color-accent-red]/10 p-3 text-sm text-[--color-accent-red]">
              {decodeURIComponent(error)}
            </div>
          )}

          <p className="mt-6 text-xs text-center text-[--color-muted-2] leading-relaxed">
            בכניסה הראשונה תידרש הרשאה לקריאת Gmail (לסריקת חשבוניות).
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-[--color-muted-2]">
          פנימי לצוות MindCET •{" "}
          <Link href="https://mindcet.org" className="hover:text-[--color-muted]">
            mindcet.org
          </Link>
        </p>
      </div>
    </div>
  );
}
