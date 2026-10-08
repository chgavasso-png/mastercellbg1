import { Store } from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { db } from "@/domain/db";
import { Shop } from "./Shop";
import { ProductPage } from "./ProductPage";
import { CatalogAdmin } from "./CatalogAdmin";

export default definePlugin({
  id: "catalogo",
  name: "Vitrine de produtos",
  routes: [
    { path: "loja", element: <Shop />, nav: { label: "Vitrine", order: 10 } },
    { path: "produto/:id", element: <ProductPage /> },
  ],
  admin: [
    {
      path: "vitrine",
      label: "Vitrine",
      icon: Store,
      group: "Loja",
      order: 10,
      element: <CatalogAdmin />,
      badge: () => db.products.all().filter((p) => p.active && p.stock <= 5).length,
    },
  ],
});
