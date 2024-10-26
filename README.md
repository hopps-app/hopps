# Hopps

Wir wollen eine cloudbasierte Open Source Buchhaltungssoftware mit AI entwickeln, damit Vereine mehr Zeit für ihre
wesentlichen Ziele und Angebote haben und frustrierte Situationen mit der Buchhaltung der Vergangenheit angehören.
Implementiert wird das Projekt von einer Gruppe engagierter EntwicklerInnen
des [Open Project e.V. Pfaffenhofen an der Ilm](https://op-paf.de).

Das Projekt wird gefördert von
der [Dt. Stiftung für Engagement und Ehrenamt](https://www.deutsche-stiftung-engagement-und-ehrenamt.de/).

![Frontend](https://github.com/hopps-app/hopps/actions/workflows/frontend.yml/badge.svg)
![Backend](https://github.com/hopps-app/hopps/actions/workflows/backend.yml/badge.svg)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=hopps-app_hopps&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=hopps-app_hopps)

## Caveats

### Docker Image für Kogito Data Index

Die Dev Services von Kogito benötigen das Docker Image `apache/incubator-kie-kogito-data-index-ephemeral:main`. Leider
wird das Image aber nur als `apache/incubator-kie-kogito-data-index-ephemeral:main-$TIMESTAMP` gepusht. Daher muss es
lokal gepullt und umbenannt werden:

    docker pull apache/incubator-kie-kogito-data-index-ephemeral:main-20240818
    docker tag apache/incubator-kie-kogito-data-index-ephemeral:main-20240818 apache/incubator-kie-kogito-data-index-ephemeral:main

Die jeweils aktuelle Version mit dem aktuellen Tag findet man
unter [hub.docker.com/r/apache/incubator-kie-kogito-data-index-ephemeral/tags](https://hub.docker.com/r/apache/incubator-kie-kogito-data-index-ephemeral/tags).

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
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

### How to use the allcontributors bot

Guide: https://allcontributors.org/docs/en/bot/usage

Available emojis: https://allcontributors.org/docs/en/emoji-key
