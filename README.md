# Fuggs

Wir wollen eine cloudbasierte Open Source Buchhaltungssoftware mit AI entwickeln, damit Vereine mehr Zeit für ihre
wesentlichen Ziele und Angebote haben und frustrierte Situationen mit der Buchhaltung der Vergangenheit angehören.
Implementiert wird das Projekt von einer Gruppe engagierter EntwicklerInnen
des [Open Project e.V. Pfaffenhofen an der Ilm](https://op-paf.de).

Das Projekt wird gefördert von
der [Dt. Stiftung für Engagement und Ehrenamt](https://www.deutsche-stiftung-engagement-und-ehrenamt.de/).

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

## Features

### Intelligent Document Processing

Fuggs automatisiert die Belegverarbeitung mit einem intelligenten Multi-Schritt-Ansatz:

1. **ZugFerd-Extraktion** - Automatische Erkennung und Extraktion von strukturierten ZugFerd/Factur-X e-Rechnungen aus PDFs
2. **KI-gestützte Analyse** - Fallback auf Azure Document Intelligence für Belege ohne eingebettete Daten
3. **Transparente Herkunft** - Nachvollziehbarkeit, ob Daten via ZugFerd, KI oder manuell erfasst wurden

Die ZugFerd-Integration nutzt das Open-Source [Mustang Project](https://www.mustangproject.org/) und unterstützt deutsche e-Rechnungsstandards (ZugFerd, XRechnung, Factur-X).

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/schitcrafter"><img src="https://avatars.githubusercontent.com/u/58911293?v=4?s=100" width="100px;" alt="Emilia Jaser"/><br /><sub><b>Emilia Jaser</b></sub></a><br /><a href="#tool-schitcrafter" title="Tools">🔧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://explore.de"><img src="https://avatars.githubusercontent.com/u/545499?v=4?s=100" width="100px;" alt="Markus Herhoffer"/><br /><sub><b>Markus Herhoffer</b></sub></a><br /><a href="#code-d135-1r43" title="Code">💻</a> <a href="#business-d135-1r43" title="Business development">💼</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.hummli.de"><img src="https://avatars.githubusercontent.com/u/25209702?v=4?s=100" width="100px;" alt="Manuel hummler"/><br /><sub><b>Manuel hummler</b></sub></a><br /><a href="#code-manuelhummler" title="Code">💻</a> <a href="#business-manuelhummler" title="Business development">💼</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/RabeaBonten"><img src="https://avatars.githubusercontent.com/u/176834893?v=4?s=100" width="100px;" alt="Rabea Bonten"/><br /><sub><b>Rabea Bonten</b></sub></a><br /><a href="#design-RabeaBonten" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kzamurnyak"><img src="https://avatars.githubusercontent.com/u/45554106?v=4?s=100" width="100px;" alt="Kostya Zamurnyak"/><br /><sub><b>Kostya Zamurnyak</b></sub></a><br /><a href="#code-kzamurnyak" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zom5583"><img src="https://avatars.githubusercontent.com/u/103882767?v=4?s=100" width="100px;" alt="zom5583"/><br /><sub><b>zom5583</b></sub></a><br /><a href="#code-zom5583" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lukas-leonhardt"><img src="https://avatars.githubusercontent.com/u/143081806?v=4?s=100" width="100px;" alt="lukas-leonhardt"/><br /><sub><b>lukas-leonhardt</b></sub></a><br /><a href="#design-lukas-leonhardt" title="Design">🎨</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/eliashehme"><img src="https://avatars.githubusercontent.com/u/176706065?v=4?s=100" width="100px;" alt="Elias Hehme"/><br /><sub><b>Elias Hehme</b></sub></a><br /><a href="#projectManagement-eliashehme" title="Project Management">📆</a> <a href="#business-eliashehme" title="Business development">💼</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.nachhilfe-paf.de"><img src="https://avatars.githubusercontent.com/u/119429802?v=4?s=100" width="100px;" alt="Simon Krumböck"/><br /><sub><b>Simon Krumböck</b></sub></a><br /><a href="#projectManagement-sk2675" title="Project Management">📆</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/3thr3n"><img src="https://avatars.githubusercontent.com/u/33932819?v=4?s=100" width="100px;" alt="3thr3n"/><br /><sub><b>3thr3n</b></sub></a><br /><a href="#code-3thr3n" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/98jan"><img src="https://avatars.githubusercontent.com/u/46779261?v=4?s=100" width="100px;" alt="Jan"/><br /><sub><b>Jan</b></sub></a><br /><a href="#code-98jan" title="Code">💻</a> <a href="#infra-98jan" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pweimann"><img src="https://avatars.githubusercontent.com/u/49559453?v=4?s=100" width="100px;" alt="Paul Weimann"/><br /><sub><b>Paul Weimann</b></sub></a><br /><a href="#code-pweimann" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

### How to use the allcontributors bot

Guide: https://allcontributors.org/docs/en/bot/usage

Available emojis: https://allcontributors.org/docs/en/emoji-key
