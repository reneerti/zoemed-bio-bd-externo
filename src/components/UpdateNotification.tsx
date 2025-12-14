import { useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";

const UpdateNotification = () => {
  const { needRefresh, offlineReady, updateServiceWorker } = useServiceWorkerUpdate();

  useEffect(() => {
    if (offlineReady) {
      toast.success("App pronto para uso offline!", {
        icon: <Download className="w-4 h-4" />,
        duration: 3000,
      });
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast(
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          <div className="flex-1">
            <p className="font-medium">Nova versão disponível!</p>
            <p className="text-sm text-muted-foreground">Clique para atualizar</p>
          </div>
          <Button size="sm" onClick={updateServiceWorker} className="ml-2">
            Atualizar
          </Button>
        </div>,
        {
          duration: Infinity,
          id: "update-notification",
        }
      );
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
};

export default UpdateNotification;
