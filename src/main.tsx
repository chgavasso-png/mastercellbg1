import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { adminPages, siteRoutes } from "@/core/plugins";
import { loadPlugins } from "@/core/load";
import { SiteLayout } from "@/site/SiteLayout";
import { Home } from "@/site/Home";
import { NotFound } from "@/site/NotFound";
import { AdminLayout } from "@/admin/AdminLayout";
import { Dashboard } from "@/admin/Dashboard";
import { Toasts, toast } from "@/ui/Toast";
import { onSyncError, whenReady } from "@/core/remote";
import { watchAuth } from "@/domain/services";
import "@/styles/palette.css";
import "@/styles/base.css";
import "@/styles/site.css";
import "@/styles/pages.css";
import "@/styles/admin.css";

loadPlugins();

const router = createBrowserRouter([
  {
    path: "/",
    element: <SiteLayout />,
    children: [
      { index: true, element: <Home /> },
      ...siteRoutes().map(({ path, element }) => ({ path, element })),
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      ...adminPages().map(({ path, element }) => ({ path, element })),
    ],
  },
]);

let lastSyncError = 0;
onSyncError((message) => {
  console.error(message);
  if (Date.now() - lastSyncError < 5000) return;
  lastSyncError = Date.now();
  toast(`Erro de conexão com o banco — ${message}`);
});
watchAuth();

const root = createRoot(document.getElementById("root")!);
const render = () =>
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
      <Toasts />
    </StrictMode>,
  );

Promise.race([whenReady(), new Promise((r) => setTimeout(r, 4000))]).then(render);
