# Aviso de atualização Android

O APK consulta `https://voryn-liard.vercel.app/android-release.json` ao abrir a área autenticada e ao voltar ao primeiro plano (intervalo mínimo de cinco minutos). Sem internet ou se a consulta falhar, o uso continua normalmente. A comparação usa o `versionCode` real da instalação, e não a versão do package.json.

Uma versão publicada mais recente para o mesmo `applicationId` mostra um aviso com “Baixar atualização” e “Agora não”. O aviso fica oculto durante um treino ativo. O download abre no navegador; o Android continua responsável pela confirmação da instalação. Não há instalação automática nem notificação com o app fechado. O identificador instalado precisa coincidir com o manifesto; isso impede o Voryn Teste de tratar a nova instalação principal como atualização.

## Publicar uma nova versão

1. Incremente `versionCode` e ajuste `versionName` em `android/app/build.gradle`.
2. Gere o APK de produção com `npm run android:release`, usando o mesmo `applicationId` e a chave permanente. Teste instalação por cima, exportação e aviso em aparelho físico quando possível.
3. Copie o APK para um novo nome em `public/downloads/`, sem sobrescrever uma versão antiga.
4. Só então ajuste `public/android-release.json` com o código, nome e caminho desse APK e atualize a página `src/pages/DownloadAndroidPage.jsx` para oferecer o mesmo arquivo.
5. Faça commit/push e aguarde o deploy. Confira que o JSON público e o download do APK estão acessíveis antes de anunciar a atualização.

O manifesto descreve o APK de produção atualmente disponível. Cada nova versão precisa manter o mesmo `applicationId` e certificado.

O APK 1.6 atual não contém este mecanismo e não pode ser atualizado por cima pela versão 1.8, pois a chave original está indisponível. A 1.8 instala separadamente como `com.voryn.mobile`; dados já sincronizados voltam com a mesma conta, mas registros locais pendentes precisam ser sincronizados no app antigo antes de removê-lo. Para futuras versões 1.8+, mantenha o identificador e a chave de produção.

O domínio está fixado tanto no serviço JS quanto no plugin nativo. Se a hospedagem mudar, atualize ambos e distribua um APK com os novos endereços. O endpoint JSON precisa de CORS para a origem local do Capacitor e de cache desativado; `vercel.json` já configura isso.
