# Sistema de Controle de Ativos Hospitalares

Sistema web para gerenciamento de ativos de TI em ambientes hospitalares.

## 🚀 Tecnologias

- **Frontend**: React 18 + Vite
- **Backend**: Firebase (Firestore + Auth)
- **Estilização**: CSS Modules + CSS Variables
- **Ícones**: Lucide React

## 📦 Instalação

```bash
npm install
npm run dev
```

## 🔧 Variáveis de Ambiente

Crie um arquivo `.env`:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Email do Master Admin
VITE_MASTER_EMAIL=seu.email@exemplo.com.br
```

## 📁 Estrutura

```
src/
├── components/     # Componentes reutilizáveis
│   ├── Inventory/  # Formulários de ativos
│   ├── UI/         # Componentes genéricos
│   └── Skeletons/  # Loading skeletons
├── constants/     # Constantes globais (options.js)
├── context/       # Contextos React
├── hooks/        # Hooks personalizados
├── lib/          # Configurações Firebase
├── pages/         # Páginas principais
└── utils/        # Utilitários
```

## 🔐 Permissões

O sistema usa perfis baseados em documentos Firestore:

- **Admin**: Acesso total
- **Usuário com unidades**: Acesso restrito às unidades permitidas

## 📊 Funcionalidades

| Página | Descrição |
|-------|----------|
| Dashboard | Visão geral e KPIs |
| Inventário | Lista e gestão de ativos |
| Movimentação | Transferir ativos |
| Monitoramento | Ativos parados |
| Relatórios | Gráficos e estatísticas |
| Cadastros | Unidades, Fornecedores, Modelos |
| Configurações | Perfis, Opções do sistema |
| Atividades | Log de auditoria |

## 🛠️ Comandos

```bash
npm run dev     # Desenvolvimento
npm run build   # Build produção
npm run lint   # Verificar erros
```

## 🔧 Regras Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Usuários - apenas leitura e própria escrita
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid || isAdmin();
    }
    
    // Ativos - baseado em unidades
    match /assets/{assetId} {
      allow read: if hasUnitAccess(resource.data.unitId);
      allow write: if isAdmin() || hasUnitAccess(request.resource.data.unitId);
    }
    
    // Histórico - subcoleção
    match /assets/{assetId}/history/{historyId} {
      allow read: if hasUnitAccess(get(/databases/$(database)/documents/assets/$(assetId)).data.unitId);
      allow create: if request.auth != null;
    }
  }
  
  function isAdmin() {
    return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
  }
  
  function hasUnitAccess(unitId) {
    let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
    return userDoc.data.allowedUnits[unitId] == true || userDoc.data.role == 'admin';
  }
}
```

## 📝 Logs de Auditoria

Todas as ações são registradas em `system_logs/audit/history`:

- Criação/Edição/Exclusão de ativos
- Movimentações
- Alterações de status
- Ações administrativas

Visualize em: **Atividades** > filtros "Auditoria"

## 🎨 Tema

O sistema suporta tema claro e escuro (baseado em `data-theme` no HTML):

```css
:root { /* Tema Claro */ }
[data-theme="dark"] { /* Tema Escuro */ }
```

## 🔗 Links Úteis

- [Firebase Console](https://console.firebase.google.com)
- [Firestore Rules](https://firebase.google.com/docs/firestore/security/rules)

## 📄 Licença

Proprietary - Todos os direitos reservados