package app.hopps.transaction.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.category.domain.Category;
import app.hopps.category.repository.CategoryRepository;
import app.hopps.document.domain.TradeParty;
import app.hopps.organization.domain.Organization;
import app.hopps.transaction.api.dto.TransactionCreateRequest;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionArea;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashSet;

@ApplicationScoped
public class TransactionCreateConverter {

    @Inject
    BommelRepository bommelRepository;

    @Inject
    CategoryRepository categoryRepository;

    public void applyRequestToTransaction(Transaction transaction, TransactionCreateRequest request,
            Organization organization) {
        // Ensure the organization is set before the counterparty logic runs — it is stored as the opposite
        // trade party (recipient for expenses, sender for income).
        transaction.setOrganization(organization);
        transaction.setName(request.name());
        transaction.setTotal(request.total());
        transaction.setTotalTax(request.totalTax());
        transaction.setCurrencyCode(request.currencyCode());
        transaction.setPrivatelyPaid(request.privatelyPaid());

        if (request.transactionDate() != null && !request.transactionDate().isBlank()) {
            LocalDate date = LocalDate.parse(request.transactionDate());
            transaction.setTransactionTime(date.atStartOfDay(ZoneOffset.UTC).toInstant());
        }

        if (request.dueDate() != null && !request.dueDate().isBlank()) {
            LocalDate date = LocalDate.parse(request.dueDate());
            transaction.setDueDate(date.atStartOfDay(ZoneOffset.UTC).toInstant());
        }

        if (request.bommelId() != null) {
            Bommel bommel = bommelRepository.findById(request.bommelId());
            transaction.setBommel(bommel);
        }

        if (request.categoryId() != null) {
            Category category = categoryRepository.findById(request.categoryId());
            transaction.setCategory(category);
        }

        if (request.area() != null && !request.area().isBlank()) {
            transaction.setArea(TransactionArea.valueOf(request.area().toUpperCase()));
        }

        // The senderName* fields describe the counterparty (vendor for expenses, customer for income). The
        // entity stores it on the side matching the direction and records the organization on the other side.
        if (request.senderName() != null && !request.senderName().isBlank()) {
            TradeParty counterparty = new TradeParty();
            counterparty.setOrganization(organization);
            counterparty.setName(request.senderName());
            counterparty.setStreet(request.senderStreet());
            counterparty.setZipCode(request.senderZipCode());
            counterparty.setCity(request.senderCity());
            transaction.setCounterparty(counterparty);
        } else {
            // Still record the organization on its side even when no counterparty was provided.
            transaction.setCounterparty(null);
        }

        if (request.tags() != null && !request.tags().isEmpty()) {
            transaction.setTags(new HashSet<>(request.tags()));
        }
    }
}
