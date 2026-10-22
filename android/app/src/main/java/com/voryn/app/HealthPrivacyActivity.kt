package com.voryn.app

import android.app.Activity
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView

class HealthPrivacyActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val text = TextView(this).apply {
            textSize = 18f
            setPadding(32, 48, 32, 48)
            text = "Voryn — Dados de saúde\n\n" +
                "Com sua autorização, o Voryn lê passos, sono, alimentação, água e peso do Health Connect para mostrar seu histórico de saúde. Você escolhe quais categorias compartilhar.\n\n" +
                "A leitura do Health Connect acontece enquanto as telas de saúde ou seus cartões estão abertos. Os resumos importados são enviados ao Supabase somente quando você toca em salvar resumos importados na conta. Registros manuais são guardados neste aparelho e sincronizados com sua conta quando houver internet e sessão válida. Você pode editar e excluir cada registro na tela da categoria. Bibliotecas de alimentos e metas permanecem neste aparelho.\n\n" +
                "Se você ativar passos pelo celular, o sensor será usado também em segundo plano, com notificação contínua, e os totais serão guardados apenas neste aparelho, sem internet. Você pode pausar na tela Passos ou na notificação. Sair da conta pausa a contagem. Ao autorizar acesso a dados de uso, o Voryn usa apenas horários de tela ligada e desligada para sugerir intervalos de sono. Não guarda nomes de aplicativos. As sugestões exigem confirmação e não medem fases do sono. Revogue esse acesso nas configurações do Android.\n\n" +
                "Esses dados não são usados para publicidade nem compartilhados com personal trainers pelo módulo Saúde. Você pode revogar permissões no Health Connect e excluir os resumos salvos na tela Saúde. Revogar acesso não apaga os resumos já salvos.\n\n" +
                "O celular não mede sozinho alimentação, água ou peso. Esses registros dependem de outros aplicativos ou dispositivos."
        }
        setContentView(ScrollView(this).apply { addView(text) })
    }
}
