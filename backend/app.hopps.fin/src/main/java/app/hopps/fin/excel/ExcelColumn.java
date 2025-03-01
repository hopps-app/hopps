package app.hopps.fin.excel;

import app.hopps.fin.jpa.entities.TransactionRecord;

import java.util.function.Function;

// TODO: Use headerKey for i18n
public record ExcelColumn(String headerKey, Function<TransactionRecord, Object> value) {

    @Override
    public String toString() {
        return "ExcelColumn[" +
                "headerKey=" + headerKey + ", " +
                "value=" + value + ']';
    }

}
