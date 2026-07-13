package app.hopps.bankimport.parser;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class Mt940ParserTest {

    private static final String HEADER = """
            :20:STARTUMS
            :25:10050000/12345678
            :28C:00001/001
            :60F:C250602EUR100,00
            """;

    private static String statement(String field86) {
        return HEADER
                + ":61:2506020602CR59,99NTRFNONREF\n"
                + ":86:" + field86 + "\n"
                + ":62F:C250602EUR159,99\n"
                + "-\n";
    }

    @Test
    void purposeSubfieldsPreserveBoundarySpace() {
        // The bank split one logical purpose across ?20/?21 exactly on a space. That space must survive so the words
        // don't glue together ("29.05.2026siehe"). Note the trailing space in ?20 sits at the split boundary.
        List<Mt940Parser.ParsedMt940Transaction> txs = Mt940Parser
                .parse(statement("?20Abrechnung 29.05.2026 ?21siehe Anlage"));

        assertEquals(1, txs.size());
        assertEquals("Abrechnung 29.05.2026 siehe Anlage", txs.get(0).purpose());
    }

    @Test
    void purposeSubfieldsDoNotInsertSpaceMidWord() {
        // When a bank splits mid-word (no boundary space), the parts must stay glued — we must not invent a space.
        List<Mt940Parser.ParsedMt940Transaction> txs = Mt940Parser.parse(statement("?20Rechnungsnu?21mmer 12345"));

        assertEquals(1, txs.size());
        assertEquals("Rechnungsnummer 12345", txs.get(0).purpose());
    }
}
