package app.hopps.category.service;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.category.domain.CategoryGroup;
import app.hopps.category.repository.CategoryGroupRepository;
import app.hopps.category.repository.CategoryGroupValueRepository;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionCategoryValue;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryGroupServiceTest {

    @Mock
    CategoryGroupRepository categoryGroupRepository;

    @Mock
    CategoryGroupValueRepository categoryGroupValueRepository;

    @Mock
    BommelRepository bommelRepository;

    @Mock
    EntityManager entityManager;

    @InjectMocks
    CategoryGroupService service;

    private static Bommel bommel(long id) {
        Bommel b = new Bommel();
        b.id = id;
        return b;
    }

    private static CategoryGroup group(long id, String name, boolean required) {
        CategoryGroup g = new CategoryGroup();
        g.id = id;
        g.setName(name);
        g.setRequired(required);
        return g;
    }

    @Test
    void applicableGroupsIsEmptyForNullBommel() {
        assertTrue(service.applicableGroups(null).isEmpty());
    }

    @Test
    void applicableGroupsQueriesBommelAndAncestors() {
        Bommel b = bommel(5L);
        when(bommelRepository.getParents(b)).thenReturn(List.of()); // no ancestors
        CategoryGroup g = group(1L, "Kostenstelle", false);
        when(categoryGroupRepository.findApplicable(any())).thenReturn(List.of(g));

        List<CategoryGroup> result = service.applicableGroups(b);

        assertEquals(1, result.size());
        assertEquals("Kostenstelle", result.get(0).getName());
    }

    @Test
    void validateAndApplyStoresValidValuesAndDiscardsNonApplicable() {
        Bommel b = bommel(5L);
        Transaction tx = new Transaction();
        tx.setBommel(b);

        CategoryGroup applicable = group(1L, "Kostenstelle", false);
        when(bommelRepository.getParents(b)).thenReturn(List.of());
        when(categoryGroupRepository.findApplicable(any())).thenReturn(List.of(applicable));
        when(categoryGroupValueRepository.existsValue(1L, "KS-100")).thenReturn(true);

        // group 2 is not applicable to this bommel → its value must be discarded
        service.validateAndApply(tx, Map.of(1L, "KS-100", 2L, "ignored"));

        assertEquals(1, tx.getCategoryValues().size());
        TransactionCategoryValue stored = tx.getCategoryValues().iterator().next();
        assertEquals(1L, stored.getCategoryGroupId());
        assertEquals("KS-100", stored.getValue());
    }

    @Test
    void validateAndApplyRejectsValueOutsideGroup() {
        Bommel b = bommel(5L);
        Transaction tx = new Transaction();
        tx.setBommel(b);

        CategoryGroup applicable = group(1L, "Kostenstelle", false);
        when(bommelRepository.getParents(b)).thenReturn(List.of());
        when(categoryGroupRepository.findApplicable(any())).thenReturn(List.of(applicable));
        when(categoryGroupValueRepository.existsValue(1L, "does-not-exist")).thenReturn(false);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.validateAndApply(tx, Map.of(1L, "does-not-exist")));
        assertTrue(ex.getMessage().contains("Kostenstelle"));
    }

    @Test
    void validateAndApplyWithNullLeavesValuesUntouched() {
        Transaction tx = new Transaction();
        tx.replaceCategoryValues(Map.of()); // start empty
        service.validateAndApply(tx, null);
        assertTrue(tx.getCategoryValues().isEmpty());
    }

    @Test
    void missingRequiredGroupsListsUnfilledRequiredGroups() {
        Bommel b = bommel(5L);
        Transaction tx = new Transaction();
        tx.setBommel(b);
        // has a value for the required group 1 but not for the required group 2
        tx.getCategoryValues().add(new TransactionCategoryValue(tx, 1L, "KS-100"));

        CategoryGroup requiredFilled = group(1L, "Kostenstelle", true); // required, filled
        CategoryGroup requiredMissing = group(2L, "Projekt", true); // required, no value

        when(bommelRepository.getParents(b)).thenReturn(List.of());
        when(categoryGroupRepository.findApplicable(any()))
                .thenReturn(List.of(requiredFilled, requiredMissing));

        List<String> missing = service.missingRequiredGroups(tx);

        assertEquals(List.of("Projekt"), missing);
    }

    @Test
    void affectedConfirmedTransactionsIsEmptyWhenNotRequired() {
        assertTrue(service.affectedConfirmedTransactionIds(false, List.of(1L), null).isEmpty());
    }

    @Test
    void affectedConfirmedTransactionsIsEmptyWhenNoBommels() {
        assertTrue(service.affectedConfirmedTransactionIds(true, List.of(), null).isEmpty());
    }
}
