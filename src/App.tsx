import { useEffect, useState } from "react";
import AdminDashboard from "./components/AdminDashboard";
import ApplicationForm from "./components/ApplicationForm";

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const syncPathname = () => setPathname(window.location.pathname);

    window.addEventListener("popstate", syncPathname);
    return () => window.removeEventListener("popstate", syncPathname);
  }, []);

  if (pathname.startsWith("/admin")) {
    return <AdminDashboard />;
  }

  return <ApplicationForm />;
}
