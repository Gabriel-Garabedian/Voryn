# Música do celular para a série

Implementada em 23/10/2026, substituindo a tentativa de controle pelo Spotify, por escolha do usuário. A funcionalidade não exige Spotify, Premium, cadastro de desenvolvedor ou alteração no Supabase.

## Uso

1. Abrir Perfil → Música para a série → Escolher arquivo de áudio.
2. Selecionar um áudio do aparelho, de até 50 MB. A compatibilidade depende dos codecs disponíveis; MP3, M4A e WAV são formatos comuns.
3. Informar o início em minutos:segundos (exemplo: 1:20) e salvar.
4. No treino, tocar em Tocar para a série. A música começa no trecho salvo. Pausar música interrompe o áudio; Reiniciar no trecho volta ao início escolhido.

## Armazenamento e reprodução

- Arquivo, nome, duração e trecho ficam no IndexedDB `voryn-local-music-v1`, separados pelo identificador da conta Voryn. Nada é enviado ao servidor. É uma cópia local: não depende de manter o arquivo original no mesmo caminho.
- A música permanece após recarregar e pode tocar offline. Cada aparelho/navegador precisa da própria seleção. Limpar dados do aplicativo/navegador remove a cópia local; armazenamento do navegador também está sujeito a políticas de espaço do sistema.
- Uma instância de áudio mantém a reprodução ao navegar entre perfil e treino. Trocar de conta ou sair limpa o player e libera a URL temporária; o arquivo fica para o próximo acesso da mesma conta. Remover música exclui o arquivo local; a exclusão da conta também tenta limpar essa cópia.
- Início inválido, arquivo incompatível, falha de armazenamento e erro de reprodução são informados. A música anterior só é substituída após a gravação bem-sucedida.
- Usar o botão não registra uma série como concluída. Reprodução com tela bloqueada, em segundo plano, chamadas e interrupções de outros aplicativos não foram validadas em Android.

## Código e verificação

- `src/services/localMusic.js`: armazenamento, metadados, validação e player compartilhado.
- `src/components/TrainingMusic.jsx`: seleção/trecho no perfil e controles durante o treino.
- `src/App.jsx`: vínculo do player à sessão atual. `AuthContext.jsx`: limpeza local ao excluir conta.
- OAuth Spotify, retornos web e plugin nativo removidos. Client ID retirado dos ambientes locais; o cadastro externo Spotify não foi alterado nem excluído. A playlist social preexistente no perfil continua independente.
- Migração social ainda não aplicada remotamente: removida a coluna `training_music` que seria usada pelo Spotify; a migração contém agora somente os recursos de fotos/identidade. O nome original do arquivo foi preservado.
- Testes de componente e player cobrem seleção, validação de trecho, falha ao salvar, leitura de duração, pausa/reinício, troca de conta, resposta atrasada e cancelamento intencional da reprodução.
- Edge com WAV real de dez segundos: armazenamento persistiu após recarregar; reprodução offline confirmou `currentTime=1`, `paused=false`; pausa/reinício, continuidade ao abrir treino e remoção persistente passaram. Telas 390/768/1440 px em claro/escuro sem overflow horizontal. Evidências em `output/playwright/local-music-*`; fixture usa apenas autenticação simulada, com IndexedDB e áudio reais.
- Fotos/chat continuam com testes próprios; regras SQL da migração social foram novamente executadas em PostgreSQL isolado.
- Verificação final: 28 testes passaram, lint sem erros e build web concluído.
- Posteriormente gerado APK assinado 1.9/código 11 (metadados em android-candidate.json), com música local conferida no bundle. Publicado posteriormente no domínio https://voryn-liard.vercel.app, com hash do download conferido; ainda sem teste físico. Testar no aparelho antes de anunciar comportamento nativo.
