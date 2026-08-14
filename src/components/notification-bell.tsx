import * as React from "react"
import { Bell, BellDot, Check, ExternalLink } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { listarMinhasNotificacoes, marcarComoLida } from "@/lib/notifications.functions"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const qc = useQueryClient()
  const listNotifications = useServerFn(listarMinhasNotificacoes)
  const markAsRead = useServerFn(marcarComoLida)

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 30000, // Refresh every 30s
  })

  const unreadCount = notifications.filter((n: any) => !n.read).length

  const mutation = useMutation({
    mutationFn: (id: string) => markAsRead({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const handleMarkAsRead = (id: string) => {
    mutation.mutate(id)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <>
              <BellDot className="h-5 w-5 text-primary animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </>
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 pb-2">
          <h4 className="text-sm font-bold">Notificações</h4>
          {unreadCount > 0 && (
             <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
               {unreadCount} novas
             </span>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/20" />
              <p className="mt-2 text-xs text-muted-foreground">Você não tem notificações no momento.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex flex-col gap-1 border-b border-border/40 p-4 transition-colors hover:bg-muted/50",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h5 className={cn("text-xs font-bold leading-none", !n.read ? "text-foreground" : "text-muted-foreground")}>
                      {n.title}
                    </h5>
                    {!n.read && (
                      <button 
                        onClick={() => handleMarkAsRead(n.id)}
                        className="text-primary hover:text-primary/80"
                        title="Marcar como lida"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {n.message}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground/60">
                      {new Date(n.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {n.link && (
                      <Button asChild variant="link" size="sm" className="h-auto p-0 text-[10px] font-bold">
                        <Link to={n.link} onClick={() => !n.read && handleMarkAsRead(n.id)}>
                          Ver detalhes <ExternalLink className="ml-1 h-2 w-2" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 bg-muted/20 border-t border-border/40 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-medium tracking-tighter">
              LotoMaster IA Notificações
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
