package app.hopps.transaction.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.TradeParty;
import app.hopps.transaction.api.dto.TransactionUpdateRequest;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashSet;

@ApplicationScoped
public class TransactionUpdateConverter {

    @Inject
    BommelRepository bommelRepository;

    public void applyUpdateRequestToTransaction(Transaction transaction, TransactionUpdateRequest request) {
        // Capture the counterparty and direction before total (and thus the direction) may change below, so
        // the parties can be re-placed correctly if the transaction flips between expense and income.
        TradeParty previousCounterparty = transaction.getCounterparty();
        boolean wasIncome = transaction.isIncome();

        if (request.name() != null) {
            transaction.setName(request.name());
        }

        // Always apply the total, including null: clearing the amount (e.g. when the analysed value turned out to be
        // in the wrong currency and the correct euro amount isn't known yet) must actually empty the field. The two
        // frontend callers always send the full form state, so null unambiguously means "cleared".
        transaction.setTotal(request.total());

        if (request.totalTax() != null) {
            transaction.setTotalTax(request.totalTax());
        }

        if (request.currencyCode() != null) {
            transaction.setCurrencyCode(request.currencyCode());
        }

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
            if (request.bommelId() > 0) {
                Bommel bommel = bommelRepository.findById(request.bommelId());
                transaction.setBommel(bommel);
            } else {
                transaction.setBommel(null);
            }
        }

        // Re-place the counterparty (senderName* fields) on the side matching the current direction and keep
        // the organization on the other side. A new counterparty is built when one was supplied; otherwise the
        // existing one is only moved when the direction flipped, to avoid needless churn.
        if (request.senderName() != null && !request.senderName().isBlank()) {
            TradeParty counterparty = new TradeParty();
            counterparty.setOrganization(transaction.getOrganization());
            counterparty.setName(request.senderName());
            counterparty.setStreet(request.senderStreet());
            counterparty.setZipCode(request.senderZipCode());
            counterparty.setCity(request.senderCity());
            transaction.setCounterparty(counterparty);
        } else if (wasIncome != transaction.isIncome()) {
            transaction.setCounterparty(previousCounterparty);
        }

        if (request.tags() != null) {
            transaction.setTags(new HashSet<>(request.tags()));
        }

        if (request.status() != null && !request.status().isBlank()) {
            transaction.setStatus(TransactionStatus.valueOf(request.status().toUpperCase()));
        }
    }
}
