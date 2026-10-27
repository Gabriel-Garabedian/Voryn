# Atividades ao ar livre — Android 1.7

## Referência investigada com REA

O Strava foi fornecido pelo usuário a partir de seu Android conectado. REA 6.8.0 e JADX headless 0.7.1 analisaram o APK instalado, versão 486.11 (12400195). SHA-256 do APK base: `7c676aeb01a8bc62b75287b007615c23b99edcac4e5ee57d7665b85be3f127e2`.

| Evidência REA | Observação estática |
| --- | --- |
| `ev_e7cdf130698707f724958a63cec7d74ddb61edabccd2945fc255324d59d53c01` | Manifesto declara localização precisa/aproximada e serviço `StravaActivityService` do tipo `location`. Há componentes de recuperação e configuração de pausa automática. |
| `ev_2cff67756cd2de49f8c860e3169bd700bdbac4399999befaab8635021409da30` | `StravaActivityService.onStartCommand` trata iniciar, parar, pausar, retomar e recuperar atividade interrompida/não sincronizada. |
| `ev_9a5e4050a694c7134677079f46100ae63abf546fe4e49fccea3a6a0f63b0771d` | `ActiveActivityStats` contém modalidade, distância em metros, tempo em milissegundos, velocidades atual/média, GPS e estado de gravação. |
| `ev_bb68aeea5179b85e46f20fd68c52511404cb6a0622b51b9321e6f67f4803104a` | `RecordingLocation` mantém latitude, longitude, precisão e horários de sistema/monotônico. |
| `ev_dff6464c8e901f3c23b2755d8461b572a8c6a1be604c6102c4f65a8ea487521c` | Estados incluem não gravando, gravando, pausado, autopausado, descartado e salvo. |

Os JSONs completos estão na pasta local `.local/share/rea/targets/strava` do operador. A extração dos APKs foi feita por `pull-adb-package`, evidência `ev_7be132aa695bdfc0964536da243becea15fcff0f7f681219e235ad10c0221ae3`. Nenhuma conta ou atividade foi modificada no Strava. O APK não foi executado nesta investigação. Não foram determinados os filtros exatos do GPS, algoritmos de autopausa, cálculo de elevação, correções de trajeto ou processamento dos servidores. Nomes de componentes sozinhos não provam esses comportamentos.

## Implementação própria no Voryn

A implementação usa os fluxos e unidades observados como referência, com código próprio e o sistema visual existente do Voryn. Nenhum método decompilado, recurso visual ou credencial do Strava foi incorporado.

- Entrada em Início → Ao ar livre, Mais → Ao ar livre e Histórico → Percursos ao ar livre.
- Corrida, caminhada e ciclismo; iniciar, pausar, retomar e finalizar/salvar.
- Serviço Android nativo `location`, iniciado pela tela visível após autorização de localização precisa. Não solicita localização permanente/em segundo plano. Notificação abre o app e permite pausar.
- GPS funciona sem rede. Distância em metros e relógio monotônico para o tempo ativo; pausas manuais não entram no tempo. Corrida/caminhada mostram min/km, ciclismo mostra km/h.
- Pontos com precisão pior que 35 m, jitter pequeno e velocidades implausíveis são rejeitados por um filtro próprio conservador. Pausas e intervalos de GPS maiores que 30 s iniciam outro segmento; não se inventa distância nos trechos ausentes.
- Gravações são persistidas em arquivos privados por conta, com substituição atômica em cada posição aceita e checkpoint periódico. Se o processo morrer, a última versão persistida reaparece pausada; o intervalo perdido não é contado como atividade.
- Histórico, detalhes com mapa e exclusão confirmada. Os trajetos ficam apenas neste aparelho; não há migração SQL, upload para a conta ou publicação social.
- Leaflet carrega apenas ao abrir o mapa nessa área. Mapas base do OpenStreetMap exigem internet e mostram atribuição. Não se baixam mapas em massa nem se armazenam tiles offline.
- O site informa que a gravação requer o APK Android; não simula rastreamento confiável em segundo plano no navegador.

Autopausa, segmentos competitivos, calorias estimadas, navegação de rotas e sincronização com servidores não fazem parte desta primeira entrega. As constantes de GPS são escolhas do Voryn e precisam de calibração; não são apresentadas como algoritmos do Strava.

## Verificação no aparelho

1. Instalar o APK 1.7 sem limpar os dados existentes e entrar na conta.
2. Testar recusa de localização, localização aproximada e GPS desligado: o app deve informar o problema e permitir nova tentativa.
3. Iniciar cada modalidade em local aberto e percorrer distância conhecida. Comparar distância e tempo com referência confiável. Testar celular parado para observar deriva.
4. Bloquear a tela, alternar de app e desligar a rede durante um percurso; confirmar notificação, persistência e continuação do GPS. Verificar restrições de bateria do Samsung.
5. Pausar, deslocar-se e retomar: não deve existir linha nem distância ligando os dois segmentos. Repetir com perda de sinal superior a 30 s.
6. Finalizar e reabrir: resumo e trajeto permanecem. Excluir com confirmação. Reiniciar/forçar parada durante outra atividade: recuperar pausada, sem inventar o trecho perdido.
7. Sair/trocar de conta: coleta deve parar e outra conta não deve ver os trajetos. Testar remoção de conta e armazenamento sem espaço.

Compilação e testes automatizados não comprovam precisão, duração da bateria ou rastreamento em tela bloqueada no dispositivo real. O histórico local se perde ao desinstalar ou limpar os dados.
