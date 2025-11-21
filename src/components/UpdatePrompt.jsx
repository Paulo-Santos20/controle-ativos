import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registrado: ' + r);
    },
    onRegisterError(error) {
      console.log('SW erro de registro', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // Mostra um toast persistente quando uma nova versão é detectada
      toast('Nova versão disponível!', {
        description: 'Clique para atualizar e ver as mudanças.',
        duration: Infinity, // Fica na tela até clicar
        action: {
          label: 'Atualizar Agora',
          onClick: () => updateServiceWorker(true), // Recarrega a página
        },
        icon: <RefreshCw size={18} color="#007aff" />,
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
};

export default UpdatePrompt;