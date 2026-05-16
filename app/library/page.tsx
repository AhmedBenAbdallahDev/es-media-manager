"use client";

/**
 * /library — Redirect to home page
 *
 * The library is now the home page. This page redirects to /.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LibraryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
