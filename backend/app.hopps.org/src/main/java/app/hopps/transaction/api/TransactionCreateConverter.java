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
import java.time.ZoneId;
import java.util.HashSet;

@ApplicationScoped
public class TransactionCreateConverter {

    @Inject
    BommelRepository bommelRepository;

    @Inject
    CategoryRepository categoryRepository;

    public void applyRequestToTransaction(Transaction transaction, TransactionCreateRequest request,
            Organization organization) {
        transaction.setName(request.name());
        transaction.setTotal(request.total());
        transaction.setTotalTax(request.totalTax());
        transaction.setCurrencyCode(request.currencyCode());
        transaction.setPrivatelyPaid(request.privatelyPaid());

        if (request.transactionDate() != null && !request.transactionDate().isBlank()) {
            LocalDate date = LocalDate.parse(request.transactionDate());
            transaction.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
        }

        if (request.dueDate() != null && !request.dueDate().isBlank()) {
            LocalDate date = LocalDate.parse(request.dueDate());
            transaction.setDueDate(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
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

        if (request.senderName() != null && !request.senderName().isBlank()) {
            TradeParty sender = new TradeParty();
            sender.setOrganization(organization);
            sender.setName(request.senderName());
            sender.setStreet(request.senderStreet());
            sender.setZipCode(request.senderZipCode());
            sender.setCity(request.senderCity());
            transaction.setSender(sender);
        }

        if (request.tags() != null && !request.tags().isEmpty()) {
            transaction.setTags(new HashSet<>(request.tags()));
        }
    }
}
