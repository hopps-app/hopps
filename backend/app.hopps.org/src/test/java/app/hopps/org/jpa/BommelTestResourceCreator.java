package app.hopps.org.jpa;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;

@ApplicationScoped
public class BommelTestResourceCreator {

    @Inject
    BommelRepository repo;

    @Inject
    OrganizationRepository orgRepo;

    /**
     * @return The bommels created
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public List<Bommel> setupSimpleTree() {
        var bommels = generateSimpleTree();
        Organization org = generateOrganization();
        org.setRootBommel(bommels.getFirst());

        repo.persist(bommels);
        orgRepo.persist(org);
        orgRepo.flush();
        repo.flush();

        for (var bommel : bommels) {
            repo.getEntityManager().refresh(bommel);
        }

        return bommels;
    }

    private static Organization generateOrganization() {
        Organization org = new Organization();
        org.setName("Hopps");
        org.setSlug("hopps");
        org.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        try {
            org.setWebsite(new URI("https://hopps.cloud/").toURL());
        } catch (MalformedURLException | URISyntaxException e) {
            throw new RuntimeException(e);
        }

        return org;
    }

    private static List<Bommel> generateSimpleTree() {
        // id=1
        Bommel root = new Bommel();
        root.setName("Root bommel");
        root.setEmoji("\uD83C\uDFF3\uFE0F\u200D⚧\uFE0F");

        // id=2
        Bommel child1 = new Bommel();
        child1.setName("Child bommel 1");
        child1.setEmoji("\uD83E\uDD7A");

        // id=3
        Bommel child2 = new Bommel();
        child2.setName("Child bommel 2");
        child2.setEmoji("\uD83D\uDC49");

        // id=4
        Bommel child3 = new Bommel();
        child3.setName("Inner child bommel 3");
        child3.setEmoji("\uD83D\uDC48");

        child1.setParent(root);
        child2.setParent(root);
        child3.setParent(child1);

        return List.of(root, child1, child2, child3);
    }
}
