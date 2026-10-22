# Saúde no Voryn com celular, sem relógio

Pesquisa em 22/10/2026, com prioridade para documentação oficial. O Samsung Health oferece diferentes recursos por país, versão, celular e acessórios. Esta implementação reproduz fluxos úteis, sem copiar o catálogo, pontuações ou algoritmos proprietários da Samsung.

| Categoria | Referência pesquisada | Voryn 1.5 | Limites |
| --- | --- | --- | --- |
| Passos | Sensor do telefone, histórico e meta | Contador próprio offline, pausa, total diário, histórico, meta e entrada manual | Precisa de sensor e permissão; bateria/forçar parada podem interromper. Não soma com Health Connect. |
| Sono | Horários, histórico e meta; medições avançadas com acessórios | Sugestão pelo intervalo de tela desligada, confirmação/edição, temporizador offline, histórico e meta | Estimativa não é medição de sono. Sem estágios, ronco, sinais vitais ou pontuação clínica. |
| Alimentação | Seis refeições, calorias, nutrientes, alimentos e porções | Seis refeições, macros opcionais, biblioteca própria, vários alimentos por registro, cálculo por gramas, repetir refeições e meta de calorias | Sem catálogo Samsung, reconhecimento de fotos, leitura de código, receitas detalhadas ou micronutrientes. |
| Água | Registros, totais, meta | Atalhos de 250/500 ml, registros editáveis, histórico, fila offline e meta | Consumo não é detectado pelo telefone; lembretes não implementados nesta versão. |
| Peso | Medições, histórico e objetivo | Entrada manual, importação opcional, histórico e peso desejado | Telefone não é balança. Sem composição corporal ou integração direta com balanças. |

Todas as categorias possuem telas próprias. Os cartões permanecem no final do Início. Registros manuais são editáveis e excluíveis. Dados não disponíveis não são tratados como zero. O uso offline da interface depende de uma sessão acessível; login/perfil inicial ainda requerem rede. A contagem nativa de passos, uma vez ativada, não depende da interface ou da rede.

## Fontes

- [Samsung: gerenciar trackers e metas](https://www.samsung.com/ca/support/mobile-devices/galaxy-phone-use-and-manage-trackers-in-samsung-health/): recursos e objetivos de passos, alimentação, sono, água e peso.
- [Samsung Health: guia de alimentação](https://images.samsung.com/is/content/samsung/p5/sg/dcode/SamsungHealth.pdf): seis refeições, busca de alimentos, porções e nutrientes. Material de uma versão anterior; não prova que cada tela é idêntica nas versões atuais.
- [Samsung Health na Coreia](https://org-sec-b2c.samsung.com/sec/samsung-health/): diferencia registros/sugestões pelo smartphone e medições com acessórios.
- [Samsung: passos no celular](https://content.samsungknowledge.com/tip/10093/en-US/index.html): sensor, posicionamento do aparelho e limitações.
- [Samsung: sono e Health Connect](https://developer.samsung.com/health/blog/en/managing-sleep-data-with-samsung-health-and-health-connect): origem e sincronização dos registros de sono.
- [Samsung: dúvidas sobre Health Connect](https://developer.samsung.com/health/health-connect-faq.html): autorizar leitura não garante que o aplicativo de origem tenha escrito dados.
- [Android: sensores de movimento](https://developer.android.com/develop/sensors-and-location/sensors/sensors_motion): contador cumulativo, reinício e permissão de atividade física.
- [Android: aplicativo básico de fitness](https://developer.android.com/health-and-fitness/fitness/basic-app/overview): serviço de saúde e permissões para passos em segundo plano.
- [Android: eventos de uso](https://developer.android.com/reference/android/app/usage/UsageEvents.Event): eventos de tela interativa e não interativa. A regra de sugestão do Voryn é própria e não um algoritmo da Samsung.
- [Open Food Facts: documentação](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/): alternativa pesquisada para catálogo, ainda não integrada. Inclui limites, atribuição e licença a considerar antes de distribuir uma integração.

Não foram validados sensores em um Samsung físico nesta implementação. O teste no aparelho precisa confirmar contagem com tela apagada, modo avião, pausa, reinício, permissão revogada, sugestões de sono e sincronização ao reconectar.
