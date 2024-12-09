import { useEffect } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const useUserAuthentication = (router: AppRouterInstance) => {
  useEffect(() => {
    const token = sessionStorage.getItem("login_password");
    if (!token) {
      router.push("/login");
    }
  }, [router]);
};
