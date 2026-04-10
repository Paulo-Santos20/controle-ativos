# Firestore Indexes

Para que o sistema funcione corretamente, adicione os seguintes índices compostos no Firebase Console:

## collections indexes

### 1. assets (orderBy lastSeen + where unitId)
```json
{
  "collectionId": "assets",
  "fields": [
    { "fieldPath": "lastSeen", "order": "ASC" },
    { "fieldPath": "unitId", "order": "ASC", "UNSUPPORT" }
  ]
}
```
**Motivo:** MonitoringPage usa `orderBy('lastSeen')` com `where('unitId', 'in', allowedUnits)`
**Solução no código:** Remover o `orderBy('lastSeen', 'asc')` ou criar índice composto

### 2. assets (orderBy timestamp + where type)
```json
{
  "collectionId": "assets",
  "fields": [
    { "fieldPath": "createdAt", "order": "DESC" },
    { "fieldPath": "type", "order": "ASC" }
  ]
}
```
**Motivo:** Dashboard pode usar ordenação por data + filtro por tipo

### 3. history (collection group - orderBy timestamp)
```json
{
  "collectionGroupId": "history",
  "fields": [
    { "fieldPath": "timestamp", "order": "DESC" }
  ]
}
```
**Motivo:** ActivityLogPage usa `collectionGroup('history')` com ordenação

### 4. users (orderBy displayName)
```json
{
  "collectionId": "users",
  "fields": [
    { "fieldPath": "displayName", "order": "ASC" }
  ]
}
```
**Motivo:** UserList usa `orderBy('displayName', 'asc')`

### 5. units (orderBy name)
```json
{
  "collectionId": "units",
  "fields": [
    { "fieldPath": "name", "order": "ASC" }
  ]
}
```
**Motivo:** Diversas páginas usam ordenação por nome

---

## Como adicionar no Firebase Console

1. Acesse Firebase Console > Firestore > Índices
2. Clique em "Adicionar índice"
3. Cole o JSON acima
4. Aguarde a criação (pode levar alguns minutos)

---

## Índices Automáticos Criados
Se aparecer erro `failed-precondition`, crie o índice manualmente pelo link no console.