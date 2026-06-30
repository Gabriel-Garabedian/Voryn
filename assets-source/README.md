# Ícones do Voryn

`icon-source.jpg` é a imagem original de alta resolução (1254x1254) usada
para gerar todos os ícones do PWA em public/ (voryn-icon-192.png,
voryn-icon-512.png, voryn-badge-96.png).

Versão anterior (gerada programaticamente via generate_icons.py) foi
substituída por este design real fornecido pelo dono do produto.

Para regenerar os ícones a partir desta imagem (ex: depois de uma nova
versão do design):

```python
from PIL import Image
src = Image.open('icon-source.jpg').convert('RGB')
src.resize((192, 192), Image.LANCZOS).save('../public/voryn-icon-192.png')
src.resize((512, 512), Image.LANCZOS).save('../public/voryn-icon-512.png')
src.resize((96, 96), Image.LANCZOS).save('../public/voryn-badge-96.png')
```
