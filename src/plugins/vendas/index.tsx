import { PackagePlus, ShoppingCart } from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { db } from "@/domain/db";
import { Checkout } from "./Checkout";
import { Orders } from "./Orders";
import { Purchases } from "./Purchases";

export default definePlugin({
  id: "vendas",
  name: "Compras e vendas",
  routes: [{ path: "checkout", element: <Checkout /> }],
  admin: [
    {
      path: "vendas",
      label: "Vendas",
      icon: ShoppingCart,
      group: "Operação",
      order: 20,
      element: <Orders />,
      badge: () => db.orders.all().filter((o) => o.status === "pendente" || o.status === "pago").length,
    },
    {
      path: "compras",
      label: "Compras",
      icon: PackagePlus,
      group: "Operação",
      order: 21,
      element: <Purchases />,
      badge: () => db.purchases.all().filter((p) => p.status === "pedido").length,
    },
  ],
});
