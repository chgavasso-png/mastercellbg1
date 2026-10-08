import { Link } from "react-router-dom";
import { Pulse } from "@/ui/Pulse";

export function Brand({ to = "/", tone = "light" }: { to?: string; tone?: "light" | "dark" }) {
  return (
    <Link to={to} className={`brand brand-${tone}`} aria-label="MasterCell">
      <Pulse className="brand-pulse" animated={false} strokeWidth={14} />
      <span className="brand-word">
        Master<b>Cell</b>
      </span>
    </Link>
  );
}
