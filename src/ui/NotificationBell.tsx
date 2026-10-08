import { Bell, BellOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { stamp } from "@/core/format";
import { Dropdown } from "./Dropdown";
import { askBrowserPermission, type Note } from "./notifications";

type Props = { notes: Note[]; unread: number; markAllRead: () => void; clear: () => void };

export function NotificationBell({ notes, unread, markAllRead, clear }: Props) {
  const navigate = useNavigate();

  return (
    <Dropdown
      label={unread ? `Notificações (${unread} novas)` : "Notificações"}
      onOpen={askBrowserPermission}
      button={<><Bell />{unread > 0 && <span className="badge">{unread}</span>}</>}
    >
      {(close) => (
        <div className="notes">
          <div className="notes-head">
            <b>Notificações</b>
            {notes.length > 0 && (
              <div className="row" style={{ gap: 4 }}>
                {unread > 0 && <button className="link" onClick={markAllRead}>Marcar como lidas</button>}
                <button className="link" onClick={clear}>Limpar</button>
              </div>
            )}
          </div>
          {notes.length === 0 ? (
            <p className="notes-empty"><BellOff />Nada novo por aqui.</p>
          ) : (
            <ul>
              {notes.map((n) => (
                <li key={n.id}>
                  <button
                    className={n.read ? "" : "unread"}
                    onClick={() => {
                      markAllRead();
                      close();
                      navigate(n.to);
                    }}
                  >
                    <span>{n.text}</span>
                    <small className="faint">{stamp(n.at)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dropdown>
  );
}
