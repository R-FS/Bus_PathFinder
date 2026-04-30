# 🚌 Bus PathFinder - Covilhã

Uma aplicação moderna e de alta performance para planeamento de rotas de autocarro na região da Covilhã. Desenvolvida com foco em UX premium, mapas interativos e precisão de horários.

![App Screenshot](https://raw.githubusercontent.com/placeholder/screenshot.png) *(Nota: Adicionar screenshot real após deploy)*

## 🚀 Funcionalidades Principais

- **🗺️ Mapas Interativos**: Visualização de todas as paragens da Covilhã com suporte a clustering para performance fluida.
- **🛣️ Snap-to-Road Routing**: Integração com OSRM para desenhar trajetos que seguem as ruas reais, não apenas linhas retas.
- **🕒 Seletor de Tempo Premium**: Controlo preciso de horas (00-24h) com suporte a cliques rápidos e pressão contínua (*long-press*) para ajuste veloz.
- **🔍 Pesquisa Inteligente**: Autocomplete de paragens e filtragem por tipo de dia (Dias Úteis, Sábados, Domingos/Feriados).
- **🏷️ Mapeamento de Linhas**: Conversão automática de IDs técnicos para nomes amigáveis (ex: `2121` -> `21A`).
- **🌙 Dark Mode Nativo**: Interface otimizada para baixa luminosidade com estética *Glassmorphism*.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18 + Vite
- **Estilização**: Tailwind CSS (Custom Design System)
- **Mapas**: Leaflet + React-Leaflet
- **Dados**: JSON estático (Horários e Paragens sincronizados)
- **Routing**: OSRM (Open Source Routing Machine) via OSM Deutschland

## 📦 Estrutura do Projeto

```
src/
├── components/
│   ├── InteractiveMap.tsx  # Lógica de mapas e rotas
│   └── SearchBox.tsx       # Interface de pesquisa e seletor de tempo
├── data/
│   ├── stops.json          # Geocodificação das paragens
│   └── schedules.json      # Horários e trajetos
└── index.css               # Design system e animações
```

## 🔧 Como Executar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 📝 Notas de Implementação

- **Performance**: O mapa utiliza `react-leaflet-cluster` para gerir centenas de pontos sem perda de frames.
- **CORS & Proxy**: Devido a restrições de segurança em browsers, os pedidos de rota são processados via `allorigins.win`.
- **UX**: Os botões de tempo utilizam eventos de `Pointer` para garantir compatibilidade entre desktop e dispositivos touch.

---
Desenvolvido com ❤️ para a mobilidade da Covilhã.
