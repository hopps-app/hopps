package app.hopps.transaction.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.category.domain.Category;
import app.hopps.category.repository.CategoryRepository;
import app.hopps.document.domain.TradeParty;
import app.hopps.transaction.api.dto.TransactionUpdateRequest;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionArea;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;

@ApplicationScoped
public class TransactionUpdateConverter {

    @Inject
    BommelRepository bommelRepository;

    @Inject
    CategoryRepository categoryRepository;

    public void applyUpdateRequestToTransaction(Transaction transaction, TransactionUpdateRequest request) {
        if (request.name() != null) {
            transaction.setName(request.name());
        }

        if (request.total() != null) {
            transaction.setTotal(request.total());
        }

        if (request.totalTax() != null) {
            transaction.setTotalTax(request.totalTax());
        }

        if (request.currencyCode() != null) {
            transaction.setCurrencyCode(request.currencyCode());
        }

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
            if (request.bommelId() > 0) {
                Bommel bommel = bommelRepository.findById(request.bommelId());
                transaction.setBommel(bommel);
            } else {
                transaction.setBommel(null);
            }
        }

        if (request.categoryId() != null) {
            if (request.categoryId() > 0) {
                Category category = categoryRepository.findById(request.categoryId());
                transaction.setCategory(category);
            } else {
                transaction.setCategory(null);
            }
        }

        if (request.area() != null && !request.area().isBlank()) {
            transaction.setArea(TransactionArea.valueOf(request.area().toUpperCase()));
        }

        // Update sender
        if (request.senderName() != null && !request.senderName().isBlank()) {
            TradeParty sender = transaction.getSender();
            if (sender == null) {
                sender = new TradeParty();
                sender.setOrganization(transaction.getOrganization());
                transaction.setSender(sender);
            }
            sender.setName(request.senderName());
            sender.setStreet(request.senderStreet());
            sender.setZipCode(request.senderZipCode());
            sender.setCity(request.senderCity());
        }

        if (request.tags() != null) {
            transaction.setTags(new HashSet<>(request.tags()));
        }
    }
}
