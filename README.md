# Hopps

Wir wollen eine cloudbasierte Open Source Buchhaltungssoftware mit AI entwickeln, damit Vereine mehr Zeit für ihre
wesentlichen Ziele und Angebote haben und frustrierte Situationen mit der Buchhaltung der Vergangenheit angehören.
Implementiert wird das Projekt von einer Gruppe engagierter EntwicklerInnen
des [Open Project e.V. Pfaffenhofen an der Ilm](https://op-paf.de).

Das Projekt wird gefördert von
der [Dt. Stiftung für Engagegemnt und Ehrenamt](https://www.deutsche-stiftung-engagement-und-ehrenamt.de/).

## Caveats

### Docker Image für Kogito Data Index

Die Dev Services von Kogito benötigen das Docker Image `apache/incubator-kie-kogito-data-index-ephemeral:main`. Leider
wird das Image aber nur als `apache/incubator-kie-kogito-data-index-ephemeral:main-$TIMESTAMP` gepusht. Daher muss es
lokal gepullt und umbenannt werden:

    docker pull apache/incubator-kie-kogito-data-index-ephemeral:main-20240818
    docker tag apache/incubator-kie-kogito-data-index-ephemeral:main-20240818 apache/incubator-kie-kogito-data-index-ephemeral:main

Die jeweils aktuelle Version mit dem aktuellen Tag findet man
unter [hub.docker.com/r/apache/incubator-kie-kogito-data-index-ephemeral/tags](https://hub.docker.com/r/apache/incubator-kie-kogito-data-index-ephemeral/tags).