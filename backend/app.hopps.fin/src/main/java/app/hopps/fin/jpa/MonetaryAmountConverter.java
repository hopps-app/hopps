package app.hopps.fin.jpa;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.javamoney.moneta.Money;

import javax.money.MonetaryAmount;

@Converter
public class MonetaryAmountConverter implements AttributeConverter<MonetaryAmount, Long> {

    @Override
    public Long convertToDatabaseColumn(MonetaryAmount attribute) {
        return attribute.getNumber().longValue();
    }

    @Override
    public MonetaryAmount convertToEntityAttribute(Long dbData) {
        return Money.of(dbData, "EUR");
    }
}
