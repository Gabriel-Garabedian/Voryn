# Skills do Voryn e do Codex

Configuração iniciada em 22/10/2026. Skills gerais são instaladas no perfil do usuário (`~/.codex/skills`); as rotinas próprias deste projeto ficam versionadas em `.agents/skills`. Metadados de origem das externas ficam em `skills-sources.json`, neste diretório. A configuração existente foi preservada.

## Rotinas do projeto

| Skill | Quando usar |
| --- | --- |
| `voryn-android-release` | Build, assinatura, instalação por cima, versão publicada e download de APK. |
| `voryn-offline-sync` | Registros locais, filas pendentes, reconexão e conflitos. |
| `voryn-access-and-billing` | Acesso aluno/personal/admin, RLS, trial, assinaturas e webhooks. |
| `voryn-health-android` | Sensores, permissões, Health Connect, sugestões de sono e fontes de passos. |
| `voryn-pdf-export` | Ficha, avaliação, progresso, JSON e salvamento/cancelamento Android. |
| `voryn-validation` | Escolha de verificações proporcionais e relato fiel de seus limites. |

Exemplos:

```text
Use $voryn-android-release para conferir se o próximo APK está pronto para publicar.
Use $voryn-offline-sync para investigar um registro que desaparece ao reconectar.
Use $voryn-access-and-billing para revisar o acesso de um aluno vinculado ao personal.
Use $voryn-health-android para investigar passos duplicados entre fontes.
Use $voryn-pdf-export para verificar a ficha com muitos exercícios no Android.
Use $voryn-validation para validar as mudanças desta tarefa.
```

As descrições permitem descoberta automática. Não é preciso mencionar uma skill em todo pedido. A presença de uma skill não autoriza cobranças, alteração de dados reais, instalação em aparelhos, publicação ou comunicação externa além do que a tarefa já autoriza.

## Perfil geral do Codex

### Adição: animações da interface

Instaladas mais seis skills: `motion-design` (LottieFiles), `gsap-core`, `gsap-react`, `gsap-performance`, `gsap-timeline` e `gsap-scrolltrigger` (GreenSock). O conjunto configurado passou de 26 para 32 skills novas no total, além das preexistentes. Revisões e adaptações estão em `skills-sources.json`; aplicação e verificações em [MOTION.md](MOTION.md).

As novas skills estarão disponíveis para descoberta automática no próximo turno. Nesta tarefa, suas instruções foram lidas diretamente e aplicadas ao código.

Instalação selecionada, sem o pacote completo Superpowers:

- Supabase: `supabase`, `supabase-postgres-best-practices`.
- Android/React: `capacitor-app-development`, `capacitor-react`, `capacitor-plugin-generator`.
- React/UX: `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`.
- Ferramentas/qualidade: `playwright`, `pdf`, `systematic-debugging`, `code-review`, `agents-md`, `skill-scanner`.
- Revisões específicas: `security-best-practices`, `security-threat-model`.
- Serviços externos: `sentry`, `gh-fix-ci`, `gh-address-comments`.
- Skill própria geral: `codex-evidence-check`, para sustentar conclusões com evidências sem repetir verificações sem motivo.

Skills previamente disponíveis, como `design-taste-frontend`, `apple-hig-designer`, `imagegen`, `openai-docs` e as skills do sistema, foram preservadas. Não se instalaram a skill Vitest baseada em versão incompatível, o Playwright Interactive sem `js_repl`, nem o plugin Claude do Mercado Pago como se fosse compatível com Codex. A rotina local de acesso/pagamentos usa o código do projeto e documentação atual do provedor.

## Windows e dependências

Para Python de apoio, foi preparado um ambiente isolado, fora do aplicativo:

```powershell
& "$env:USERPROFILE/.codex/skill-tools/.venv/Scripts/python.exe" -X utf8 --version
```

Ele contém PyYAML, reportlab, pypdf, pdfplumber e PyMuPDF. Para PDFs, há renderização via PyMuPDF quando Poppler não estiver disponível; extração de texto não substitui inspeção das páginas. Não se trocou a biblioteca de PDFs do Voryn.

O Playwright possui uma entrada PowerShell, com CLI fixada em 0.1.22:

```powershell
& "$env:USERPROFILE/.codex/skills/playwright/scripts/playwright_cli.ps1" --help
```

A primeira execução pode baixar o pacote npm para o cache. Os navegadores são recursos separados. Use sessões de teste isoladas e encerre apenas a sessão criada para a tarefa, preservando o navegador do usuário.

`gh-fix-ci` e `gh-address-comments` exigem GitHub CLI e login; `sentry` exige a CLI descrita pela skill e acesso ao projeto. Essas integrações não foram autenticadas. A instalação de uma skill não significa que a conta está conectada. O Android SDK/JDK e um dispositivo continuam necessários para comprovar comportamentos nativos.

## Ajustes locais e manutenção

- Pastas Vercel usam o nome canônico declarado no frontmatter.
- O campo de compatibilidade das duas skills Capawesome foi preservado em `metadata` para passar no validador local.
- Exemplos de assinatura Android usam variáveis de ambiente para senhas.
- A skill `agents-md` preserva `CLAUDE.md` existente e não exige atribuição automática de commits.
- `systematic-debugging` funciona isoladamente, sem exigir a instalação das demais skills Superpowers.
- Playwright ganhou um wrapper PowerShell; PDF recebeu orientação para o Python isolado e renderização disponível.

Cada origem é fixada por commit. Uma atualização deve revisar novamente conteúdo e scripts, reaplicar somente ajustes ainda necessários e validar; não sobrescrever silenciosamente a cópia adaptada. O inventário local completo, com hashes dos arquivos instalados e revisão estática, fica em `~/.codex/skills-installation.json`.

Para inspeção de release, sem alterar arquivos:

```powershell
node .agents/skills/voryn-android-release/scripts/inspect-release.mjs
node .agents/skills/voryn-android-release/scripts/inspect-release.mjs --ready
```

O segundo comando falha se os metadados do build candidato e da versão anunciada divergirem. Isso é esperado enquanto o site oferece uma versão anterior e o próximo APK está em preparação. Nenhum dos comandos comprova a versão interna do APK, assinatura, instalação em aparelho ou deploy.

Ao concluir a configuração, as skills estarão disponíveis para descoberta no próximo turno. Se não aparecerem no seletor, reabra a sessão do Codex. As skills do projeto acompanham o Git; as globais precisam ser instaladas separadamente em outra máquina.

## Verificação desta instalação

- As 26 skills novas passaram na validação de frontmatter e nomes; YAML da interface, ícones referenciados e caminhos locais foram conferidos.
- A revisão estática das seis skills do Voryn e da skill geral própria não produziu achados. No conjunto externo, os alertas remanescentes do scanner são seus próprios padrões e exemplos documentais de ataque, examinados como material de detecção, não executados.
- O wrapper PowerShell do Playwright abriu e encerrou uma sessão isolada no Edge, sem usar o perfil do usuário.
- O Python isolado gerou um PDF sintético, extraiu texto com duas bibliotecas e renderizou uma página para imagem.
- O helper de release inspecionou o APK existente e seu hash e rejeitou `--ready` devido à divergência esperada entre build candidato e publicação atual.

Esses checks comprovam estrutura e funcionamento básico das ferramentas. Não são uma auditoria completa das dependências, um benchmark das skills nem comprovação de assinatura/instalação do próximo APK. O app não precisou ser recompilado para esta configuração de instruções e documentação.
