# LotoMasteria — Importador de Jogos (0.1.0)

Extensão Chrome Manifest V3 com importação dos TXT e JSON v1 do LotoMasteria, validação, prévia, preenchimento do volante e inclusão no carrinho em lotes. Não paga, faz login, resolve desafios ou acessa APIs privadas.

Abra `LEIA-ME.html` para instalação e uso no Windows. Pacote sem build, dependências ou serviços externos em tempo de execução. Na página de extensões do Chrome, carregue a pasta que contém `manifest.json`.

## Validação e limitações

Os controles DOM de Lotofácil, Dia de Sorte, Timemania e Lotomania foram observados no portal público em 17/11/2026. As demais modalidades usam os mesmos identificadores quando presentes e o importador para se o volante não for identificado. O código não modifica Angular nem lê cookies, credenciais ou dados de pagamento.

Testes unitários usam JSDOM, fixtures dos controles observados e APIs Chrome simuladas. Não foi instalada a extensão em uma conta da Caixa nem feita inclusão ou pagamento reais por um agente. A versão deve começar com um jogo para validação pelo usuário no próprio navegador. Ainda não publicada na Chrome Web Store.

## Testes

```sh
npm ci
npm test
```

Os testes também importam `../../src/lib/jogos-export.ts`, para verificar a compatibilidade real dos arquivos produzidos pelo site. Execute a partir desta pasta dentro do repositório LotoMasteria, usando Node 24.

## Pacote de instalação

```sh
python3 empacotar.py /caminho/lotomasteria-extensao-v0.1.0.zip
```

O ZIP inclui apenas arquivos da extensão e o guia. Não inclui node_modules, testes ou dependências de desenvolvimento.

## Retomada e confirmação

Cada inclusão é marcada como incerta antes do clique. O progresso avança somente quando a contagem do carrinho aumenta exatamente em um e o concurso e a modalidade permanecem iguais. Timeout ou interrupção exige conferência manual do usuário; nunca há nova tentativa automática do clique. Não é possível inferir pagamento ou registro oficial a partir do carrinho. Mudanças externas no carrinho ou no concurso bloqueiam a retomada.

A sessão persiste em `chrome.storage.local`, inclui jogos e histórico da conferência manual e pertence à aba de origem. Depois de um recarregamento ela só é restaurada por comando do usuário, sem reinício automático. Uma nova importação exige encerrar a sessão anterior. As permissões se limitam a storage, scripting e ao host oficial www.loteriasonline.caixa.gov.br.
