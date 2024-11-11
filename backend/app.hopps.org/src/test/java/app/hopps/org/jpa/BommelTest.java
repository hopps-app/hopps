package app.hopps.org.jpa;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class BommelTest {

    @Inject
    BommelRepository repo;

    @Inject
    OrganizationRepository orgRepo;

    @Inject
    BommelTestResourceCreator resourceCreator;

    @BeforeEach
    @Transactional
    void clearDatabase() {
        repo.deleteAll();
    }

    @Test
    @TestTransaction
    void simpleChildrenSearch() {
        // Arrange
        var existingBommels = resourceCreator.setupSimpleTree();
        var expectedChildren = List.of(existingBommels.getLast());

        // Act
        List<TreeSearchBommel> treeSearchChildren = repo.getChildrenRecursive(existingBommels.get(1));

        // Assert
        var actualChildren = treeSearchChildren.stream()
                .map(TreeSearchBommel::bommel)
                .toList();

        assertEquals(expectedChildren, actualChildren);
    }

    @Test
    @TestTransaction
    void twoLayerChildrenSearch() {
        // Arrange
        var existingBommels = resourceCreator.setupSimpleTree();
        List<TreeSearchBommel> expectedChildren = List.of(
                new TreeSearchBommel(existingBommels.get(1), false, List.of(1L, 2L)),
                new TreeSearchBommel(existingBommels.get(2), false, List.of(1L, 3L)),
                new TreeSearchBommel(existingBommels.get(3), false, List.of(1L, 2L, 4L)));

        // Act
        List<TreeSearchBommel> actualChildren = repo.getChildrenRecursive(existingBommels.getFirst());

        // Assert
        assertEquals(expectedChildren, actualChildren);
    }

    @Test
    @TestTransaction
    void getChildrenWithCycle() {
        // Arrange
        var bommel1 = new Bommel();
        bommel1.setName("Bommel1");

        var bommel2 = new Bommel();
        bommel2.setName("Bommel2");

        var bommel3 = new Bommel();
        bommel3.setName("Bommel3");

        bommel1.setParent(bommel2);
        bommel2.setParent(bommel3);
        bommel3.setParent(bommel1);

        // Scary!
        repo.persist(bommel1, bommel2, bommel3);

        // Act + Assert
        assertThrows(
                WebApplicationException.class,
                () -> repo.getChildrenRecursive(bommel1));
    }

    @Test
    @TestTransaction
    void simpleGetParentsTest() {
        // Arrange
        var existingBommels = resourceCreator.setupSimpleTree();
        var expectedParentsList = List.of(existingBommels.get(1), existingBommels.getFirst());

        // Act
        List<TreeSearchBommel> treeSearchParents = repo.getParents(existingBommels.get(3));

        // Assert
        var actualParents = treeSearchParents.stream()
                .map(TreeSearchBommel::bommel)
                .toList();
        assertEquals(expectedParentsList, actualParents);
    }

    @Test
    @TestTransaction
    void getParentsWithCycle() {
        // Arrange
        var bommel1 = new Bommel();
        bommel1.setName("Bommel1");

        var bommel2 = new Bommel();
        bommel2.setName("Bommel2");

        var bommel3 = new Bommel();
        bommel3.setName("Bommel3");

        bommel1.setParent(bommel2);
        bommel2.setParent(bommel3);
        bommel3.setParent(bommel1);

        // Scary!
        repo.persist(bommel1, bommel2, bommel3);

        // Act + Assert
        assertThrows(
                WebApplicationException.class,
                () -> repo.getParents(bommel1));
    }

    @Test
    @TestTransaction
    void getRoot() {
        // Arrange
        List<Bommel> existingBommels = resourceCreator.setupSimpleTree();

        // Act
        Bommel actual = repo.getRoot();

        // Assert
        Bommel expected = existingBommels.getFirst();

        assertNotNull(actual);
        assertEquals(expected, actual);
    }

    @Test
    @TestTransaction
    void simpleInsertionTest() {
        // Arrange
        resourceCreator.setupSimpleTree();
        Bommel root = repo.getRoot();

        Bommel newChild = new Bommel();
        newChild.setName("New child");
        newChild.setEmoji("\uD83C\uDF77");
        newChild.setParent(root);

        // Act
        repo.insertBommel(newChild);
        repo.flush();

        // Assert
        repo.getEntityManager().refresh(root);
        assertEquals(3, root.getChildren().size());
        assertTrue(root.getChildren().contains(newChild));

        repo.ensureConsistency();
    }

    @Test
    @TestTransaction
    void disallowTwoRoots() {
        // Arrange
        resourceCreator.setupSimpleTree();
        Organization org = orgRepo.listAll().getFirst();

        Bommel fakeRoot = new Bommel();
        fakeRoot.setOrganization(org);

        fakeRoot.setName("I'm a root for sure trust me");

        // Act
        assertThrows(
                WebApplicationException.class,
                () -> repo.createRoot(fakeRoot));

        // Assert
        repo.ensureConsistency();
    }

    @Test
    @DisplayName("Do not allow accidentally creating a new root with the standard insert method")
    void disallowCreatingNewRootWithNormalInsertMethod() {
        // Arrange
        resourceCreator.setupSimpleTree();

        Bommel accidentalRoot = new Bommel();
        accidentalRoot.setName("Oops");

        // Act
        assertThrows(
                WebApplicationException.class,
                () -> repo.insertBommel(accidentalRoot));

        // Assert
        repo.ensureConsistency();
    }

    @Test
    @TestTransaction
    void disallowAccidentalRecursiveDelete() {
        var bommels = resourceCreator.setupSimpleTree();
        var toBeDeleted = bommels.get(1);
        assertEquals(1, toBeDeleted.getChildren().size());

        assertThrows(
                WebApplicationException.class,
                () -> QuarkusTransaction.requiringNew()
                        .run(
                                () -> repo.deleteBommel(toBeDeleted, false)));

        repo.ensureConsistency();
    }

    @Test
    @TestTransaction
    void deletionWorks() {
        // Arrange
        var bommels = resourceCreator.setupSimpleTree();

        // Act
        repo.deleteBommel(bommels.get(2), false);

        // Assert
        assertEquals(3, repo.count());
    }

    @Test
    @TestTransaction
    void recursiveDeletionWorks() {
        // Arrange
        var bommels = resourceCreator.setupSimpleTree();

        // Act
        repo.deleteBommel(bommels.get(1), true);

        // Assert
        assertEquals(2, repo.count());
    }

    @Test
    @TestTransaction
    void ensureConsistencyDetectsCycle() {
        // Arrange
        var bommel1 = new Bommel();
        bommel1.setName("Bommel1");

        var bommel2 = new Bommel();
        bommel2.setName("Bommel2");

        var bommel3 = new Bommel();
        bommel3.setName("Bommel3");

        bommel1.setParent(bommel2);
        bommel2.setParent(bommel3);
        bommel3.setParent(bommel1);

        // Scary!
        repo.persist(bommel1, bommel2, bommel3);

        // Act + Assert
        assertThrows(
                WebApplicationException.class,
                () -> repo.ensureConsistency());
    }

    @Test
    @TestTransaction
    void ensureConsistencyDetectsMultipleRoots() {
        // Arrange
        resourceCreator.setupSimpleTree();

        var secondRoot = new Bommel();
        secondRoot.setName("illegal second root");

        // Scary
        repo.persist(secondRoot);

        // Act + Assert
        assertThrows(
                WebApplicationException.class,
                () -> repo.ensureConsistency());
    }

    @Test
    @TestTransaction
    void simpleBommelMoveWorks() {
        // Arrange
        var bommels = resourceCreator.setupSimpleTree();
        // Refetch child from database to make sure its managed
        Bommel child = repo.findById(bommels.get(3).id);
        Bommel parent = bommels.get(2);

        // Act
        repo.moveBommel(child, parent);
        repo.flush();

        // Assert
        var newParent = repo.findById(parent.id);
        repo.getEntityManager().refresh(newParent);
        assertEquals(1, newParent.getChildren().size());
        assertEquals(Set.of(child), newParent.getChildren());
        assertEquals(4, repo.count());

        repo.ensureConsistency();
    }
}
