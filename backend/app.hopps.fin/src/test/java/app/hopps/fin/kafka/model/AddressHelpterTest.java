package app.hopps.fin.kafka.model;

import app.hopps.fin.jpa.entities.Address;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import org.mustangproject.TradeParty;
import org.mustangproject.Invoice;
import app.hopps.zugferd.ZugFerdService;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
public class AddressHelpterTest {

    @Inject
    ZugFerdService zugFerdService;

    @Test
    void shouldConvertTradePartyToJpa(TradeParty tradeParty) throws Exception {

        //given
        InputStream stream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");

        //when
        Address address = AddressHelper.convertToJpa(zugFerdService.getInvoice(1L, stream).getSender());

        //then
        assertNotNull(address);

        System.out.println(address.getState());
    }
}
