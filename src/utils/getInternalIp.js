// src/utils/getInternalIP.js

export const getLocalIP = async () => {
  return new Promise((resolve) => {
    try {
      const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
      
      if (!RTCPeerConnection) {
        resolve(null);
        return;
      }

      const pc = new RTCPeerConnection({ iceServers: [] }); // Sem servidores externos
      pc.createDataChannel(''); // Cria canal de dados falso

      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          pc.close();
          resolve(null);
          return;
        }
        
        // O IP está dentro da string 'candidate'
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
        const match = e.candidate.candidate.match(ipRegex);
        
        if (match) {
          const ip = match[1];
          // Filtra para garantir que é um IP local (10.x, 192.x, 172.x)
          if (ip.startsWith('10.') || ip.startsWith('192.') || ip.startsWith('172.')) {
            pc.onicecandidate = () => {}; // Para de ouvir
            pc.close();
            resolve(ip);
          }
        }
      };

      pc.createOffer().then((sdp) => {
        pc.setLocalDescription(sdp);
      }).catch((err) => {
        console.error(err);
        resolve(null);
      });

      // Timeout de 1s se não conseguir
      setTimeout(() => {
        resolve(null); 
      }, 1000);

    } catch (error) {
      console.error("Erro ao obter IP local:", error);
      resolve(null);
    }
  });
};