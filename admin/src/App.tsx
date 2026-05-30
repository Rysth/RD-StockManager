import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes";
import { useEffect } from "react";
import { useDocumentTitle } from "./hooks/useDocumentTitle";
import { useAuthStore } from "./stores/authStore";
import { useIsMobile } from "./hooks/use-mobile";

function App() {
  const isMobile = useIsMobile();
  const validateSession = useAuthStore((state) => state.validateSession);

  // Initialize document title with business data
  useDocumentTitle();

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  return (
    <>
      <AppRoutes />
      <Toaster
        position={isMobile ? "bottom-center" : "bottom-right"}
        toastOptions={{
          duration: 3000,
          style: {
            background: "#333",
            color: "#fff",
            marginBottom: isMobile ? "80px" : "20px", // Account for bottom nav on mobile
          },
          success: {
            icon: "✅",
          },
        }}
      />
    </>
  );
}

export default App;
