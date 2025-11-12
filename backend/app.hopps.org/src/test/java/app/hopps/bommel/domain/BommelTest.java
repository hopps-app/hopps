package app.hopps.bommel.domain;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.domain.TreeSearchBommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.narayana.jta.QuarkusTransactionException;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import org.flywaydb.core.Flyway;
import org.instancio.Instancio;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.MalformedURLException;
import java.net.URISyntaxException;
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

    @Inject
    Flyway flyway;

    @BeforeEach
    @Transactional
    public void cleanDatabase() {
        orgRepo.deleteAll();
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
        long rootBommelId = existingBommels.getFirst().id;
        List<TreeSearchBommel> expectedChildren = List.of(
                new TreeSearchBommel(existingBommels.get(1), false,
                        List.of(rootBommelId, existingBommels.get(1).id)),
                new TreeSearchBommel(existingBommels.get(2), false,
                        List.of(rootBommelId, existingBommels.get(2).id)),
                new TreeSearchBommel(existingBommels.get(3), false,
                        List.of(rootBommelId, existingBommels.get(1).id, existingBommels.get(3).id)));

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
    void simpleGetParentsTest() {
        // Arrange
        flyway.clean();
        flyway.migrate();

        // bommel with id=2 is root
        // id=4 is child of id=2
        // id=7 is child of id=4

        var expectedParentsList = List.of(
                repo.findById(4L),
                repo.findById(2L));

        var child = repo.findById(7L);

        // Act
        List<TreeSearchBommel> treeSearchParents = repo.getParents(child);

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
    void simpleInsertionTest() {
        // Arrange
        var existingBommels = resourceCreator.setupSimpleTree();
        Bommel root = existingBommels.getFirst();

        Bommel newChild = new Bommel();
        newChild.setName("New child");
        newChild.setEmoji("\uD83C\uDF77");
        newChild.setParent(root);

        // Act
        repo.insertBommel(newChild);
        repo.flush();

        // Assert
        var updatedRoot = repo.findById(root.id);
        assertEquals(3, updatedRoot.getChildren().size());
        assertTrue(updatedRoot.getChildren().contains(newChild));

        repo.ensureConsistency();
    }

    @Test
    @TestTransaction
    void disallowTwoRootsInSameOrg() {
        // Arrange
        resourceCreator.setupSimpleTree();
        Organization org = orgRepo.findAll().firstResult();

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
    @TestTransaction
    void disallowRootWithoutOrganization() {
        Bommel illegalRoot = new Bommel();
        illegalRoot.setName("I'm a lonely root bommel without an org");

        assertThrows(
                WebApplicationException.class,
                () -> repo.createRoot(illegalRoot));
    }

    @Test
    @TestTransaction
    void allowOrganizationWithoutRoot() {
        Organization org = BommelTestResourceCreator.generateOrganization();

        assertDoesNotThrow(() -> orgRepo.persist(org));
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
    void bommelMoveBetweenOrganizationsFails() throws MalformedURLException, URISyntaxException {
        resourceCreator.setupTwoTreesAndOrgs();
        var orgs = orgRepo.listAll();
        var firstOrg = orgs.getFirst();
        var secondOrg = orgs.get(1);
        var child = firstOrg.getRootBommel()
                .getChildren()
                .stream()
                .filter(bommel -> bommel.getChildren().isEmpty())
                .findFirst()
                .get();
        var root = secondOrg.getRootBommel();

        assertThrows(
                WebApplicationException.class,
                () -> repo.moveBommel(child, root));
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

    @Test
    void organizationsCanCoexist() throws URISyntaxException, MalformedURLException {
        resourceCreator.setupTwoTreesAndOrgs();

        assertDoesNotThrow(() -> repo.ensureConsistency());
    }

    @Test
    void shouldNotCascadeParent() {
        // given
        Bommel parent = Instancio.create(Bommel.class);
        parent.id = null;
        parent.setParent(null);
        parent.getOrganization().id = null;

        Bommel child = Instancio.create(Bommel.class);
        child.id = null;
        child.setParent(parent);
        child.setOrganization(null);

        // when
        QuarkusTransaction.begin();
        repo.persist(child);
        assertThrows(QuarkusTransactionException.class, QuarkusTransaction::commit);
    }

    @Test
    @TestTransaction
    void simpleGetOrganizationTest() {
        // given
        var bommels = resourceCreator.setupSimpleTree();
        var expectedOrg = bommels.getFirst().getOrganization();
        var bommel = bommels.get(1);

        // when
        var actualOrg = repo.getOrganization(bommel);

        // then
        assertNotNull(actualOrg);
        assertEquals(expectedOrg.getId(), actualOrg.getId());
    }

    @Test
    @TestTransaction
    void getOrganizationOnRootTest() {
        // given
        var bommels = resourceCreator.setupSimpleTree();
        var expectedOrg = bommels.getFirst().getOrganization();
        var bommel = bommels.getFirst();

        // when
        var actualOrg = repo.getOrganization(bommel);

        // then
        assertNotNull(actualOrg);
        assertEquals(expectedOrg.getId(), actualOrg.getId());
    }
}
