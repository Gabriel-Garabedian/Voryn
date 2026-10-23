# Aviso de atualização Android

O APK consulta `https://voryn-liard.vercel.app/android-release.json` ao abrir a área autenticada e ao voltar ao primeiro plano (intervalo mínimo de cinco minutos). Sem internet ou se a consulta falhar, o uso continua normalmente. A comparação usa o `versionCode` real da instalação, e não a versão do package.json.

Uma versão publicada mais recente mostra um aviso com “Baixar atualização” e “Agora não”. O aviso fica oculto durante um treino ativo. O download abre no navegador; o Android continua responsável pela confirmação da instalação. Não há instalação automática nem notificação com o app fechado.

## Publicar uma nova versão

1. Incremente `versionCode` e ajuste `versionName` em `android/app/build.gradle` (o próximo build já está preparado como código 8, versão 1.7).
2. Gere o APK com `npm run android:apk`, usando a mesma chave de assinatura da versão instalada. Teste instalação por cima, exportação e aviso em aparelho físico.
3. Copie o APK para um novo nome em `public/downloads/`, sem sobrescrever uma versão antiga.
4. Só então ajuste `public/android-release.json` com o código, nome e caminho desse APK e atualize a página `src/pages/DownloadAndroidPage.jsx` para oferecer o mesmo arquivo.
5. Faça commit/push e aguarde o deploy. Confira que o JSON público e o download do APK estão acessíveis antes de anunciar a atualização.

O manifesto permanece na versão 1.6, código 7, porque esse é o APK atualmente disponível. Não anuncie a 1.7 até gerar e testar seu arquivo. Alterar somente o site ou fazer push sem publicar outro APK não deve disparar o aviso.

O APK 1.6 atual não contém este mecanismo. É necessário instalar manualmente uma primeira versão que inclua o aviso; a partir dela, as próximas publicações poderão ser detectadas. Para preservar registros ainda não sincronizados, instale por cima em vez de desinstalar.

O domínio está fixado tanto no serviço JS quanto no plugin nativo. Se a hospedagem mudar, atualize ambos e distribua um APK com os novos endereços. O endpoint JSON precisa de CORS para a origem local do Capacitor e de cache desativado; `vercel.json` já configura isso.
