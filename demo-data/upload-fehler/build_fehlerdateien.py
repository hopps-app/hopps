"""Erzeugt Testdateien, die beim Beleg-Upload gezielt Fehler auslösen (siehe README.md).

Aufruf aus diesem Ordner:  python build_fehlerdateien.py
Nur Standardbibliothek. Die großen Dateien sind per .gitignore vom Repo ausgenommen.
"""

import shutil
import zipfile
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "dateien"
SOMMERFEST_BELEG = HERE.parent / "sommerfest" / "belege" / "beleg-A-getraenke-huber.pdf"

MB = 1024 * 1024
# Upload-Grenze in SPA (MAX_UPLOAD_MB) und Backend (quarkus.http.limits.max-body-size=10M)
LIMIT = 10 * MB


def minimal_pdf(text: str) -> bytes:
    """Kleines, gültiges einseitiges PDF mit einer Textzeile."""
    content = f"BT /F1 18 Tf 72 720 Td ({text}) Tj ET".encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + content + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


def padded_pdf(text: str, size: int) -> bytes:
    """Gültiges PDF, per Kommentarzeilen vor %%EOF auf exakt `size` Bytes aufgefüllt."""
    base = minimal_pdf(text)
    head, eof = base[: -len(b"%%EOF\n")], b"%%EOF\n"
    missing = size - len(base)
    if missing < 2:
        raise ValueError("Zielgröße zu klein")
    padding = b"%" + b"0" * (missing - 2) + b"\n"
    return head + padding + eof


def main() -> None:
    OUT.mkdir(exist_ok=True)

    # 1) Zu groß: wird schon im Browser abgelehnt ("Zu groß").
    (OUT / "zu-gross-12mb.pdf").write_bytes(padded_pdf("Zu gross: 12 MB", 12 * MB))

    # 2) Genau 10 MB: der Browser lässt die Datei durch (Grenze inklusive), der Multipart-Body ist aber größer als
    #    10 MB, daher lehnt das Backend mit 413 ab. Testet den Server-Pfad derselben Fehlermeldung.
    (OUT / "genau-10mb.pdf").write_bytes(padded_pdf("Genau 10 MB", LIMIT))

    # 3) Falscher Typ: vom Browser abgelehnt ("Dateityp nicht unterstützt").
    with zipfile.ZipFile(OUT / "falscher-typ.docx", "w") as z:
        z.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        z.writestr("word/document.xml", '<?xml version="1.0"?><document>Kein Beleg</document>')
    (OUT / "falscher-typ.txt").write_text("Das ist kein Beleg.\n", encoding="utf-8")

    # 4) Duplikat: gleicher Inhalt wie ein Sommerfest-Beleg. Liefert 409 ("Datei bereits vorhanden"), sobald
    #    beleg-A-getraenke-huber.pdf bereits hochgeladen ist (oder diese Datei ein zweites Mal hochgeladen wird).
    shutil.copyfile(SOMMERFEST_BELEG, OUT / "duplikat-getraenke-huber.pdf")

    # 5) Kein echtes PDF: Endung .pdf, Inhalt Text. Upload klappt, die Analyse scheitert, der Beleg erscheint in der
    #    Tabelle als "Manuell ausfüllen".
    (OUT / "kaputt-kein-pdf.pdf").write_text("Das ist Text mit PDF-Endung, kein PDF.\n", encoding="utf-8")

    # 6) Gültiger kleiner Beleg ohne Fehler, für gemischte Uploads (Erfolg + Fehler in einem Rutsch).
    (OUT / "ok-kleiner-beleg.pdf").write_bytes(minimal_pdf("Quittung Testverein 12,50 EUR"))

    for f in sorted(OUT.iterdir()):
        print(f"{f.name:32} {f.stat().st_size:>12,} Bytes")


if __name__ == "__main__":
    main()
