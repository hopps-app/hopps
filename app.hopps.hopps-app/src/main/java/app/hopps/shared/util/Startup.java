package app.hopps.shared.util;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import app.hopps.member.service.MemberKeycloakSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import io.quarkus.runtime.LaunchMode;
import io.quarkus.runtime.StartupEvent;
import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.document.domain.TagSource;
import app.hopps.document.domain.TradeParty;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.domain.Tag;
import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.transaction.repository.TransactionRecordRepository;

@ApplicationScoped
public class Startup
{
	@Inject
	BommelRepository bommelRepository;

	@Inject
	MemberRepository memberRepository;

	@Inject
	DocumentRepository documentRepository;

	@Inject
	TransactionRecordRepository transactionRepository;

	@Inject
	MemberKeycloakSyncService memberKeycloakSyncService;

	@Inject
	app.hopps.member.service.KeycloakAdminService keycloakAdminService;

	@Inject
	OrganizationRepository organizationRepository;

	private static final Logger LOG = LoggerFactory.getLogger(Startup.class);

	/**
	 * This method is executed at the start of your application
	 */
	@Transactional
	public void start(@Observes StartupEvent evt)
	{
		// in DEV mode we seed some data
		if (LaunchMode.current() == LaunchMode.DEVELOPMENT)
		{
			// Get the default organization for demo data
			Organization defaultOrg = getDefaultOrganization();

			// Only seed demo data if Max Mustermann doesn't exist yet
			if (memberRepository.findByEmail("max.mustermann@example.com") == null)
			{
				// Create demo members
				Member maxMustermann = new Member();
				maxMustermann.setFirstName("Max");
				maxMustermann.setLastName("Mustermann");
				maxMustermann.setEmail("max.mustermann@example.com");
				maxMustermann.setPhone("+49 123 456789");
				maxMustermann.setOrganization(defaultOrg);
				memberRepository.persist(maxMustermann);

				Member lisaSchmidt = new Member();
				lisaSchmidt.setFirstName("Lisa");
				lisaSchmidt.setLastName("Schmidt");
				lisaSchmidt.setEmail("lisa.schmidt@example.com");
				lisaSchmidt.setOrganization(defaultOrg);
				memberRepository.persist(lisaSchmidt);

				// Create Bommels with assigned Bommelwarts
				Bommel root = new Bommel();
				root.setIcon("home");
				root.setTitle("Verein");
				root.setResponsibleMember(maxMustermann);
				root.setOrganization(defaultOrg);
				bommelRepository.persist(root);

				Bommel jugend = new Bommel();
				jugend.setIcon("group");
				jugend.setTitle("Jugend");
				jugend.parent = root;
				jugend.setResponsibleMember(lisaSchmidt);
				jugend.setOrganization(defaultOrg);
				bommelRepository.persist(jugend);

				Bommel orchester = new Bommel();
				orchester.setIcon("music");
				orchester.setTitle("Orchester");
				orchester.parent = root;
				orchester.setOrganization(defaultOrg);
				bommelRepository.persist(orchester);

				Bommel anfaenger = new Bommel();
				anfaenger.setIcon("education");
				anfaenger.setTitle("Anfaenger");
				anfaenger.parent = jugend;
				anfaenger.setOrganization(defaultOrg);
				bommelRepository.persist(anfaenger);

				// Create demo documents
				seedDocuments(root, jugend, orchester, defaultOrg);
			}

			// Bootstrap alice and bob users (always in DEV mode)
			bootstrapDefaultUsers();
		}
	}

	private void seedDocuments(Bommel root, Bommel jugend, Bommel orchester, Organization org)
	{
		DemoTags tags = createDemoTags(org);

		// Confirmed documents without transactions (will trigger transaction
		// creation alert)
		seedOfficeSuppliesDocument(root, tags, org);
		seedCateringDocument(jugend, tags, org);

		// Confirmed documents with transactions
		seedMusicEquipmentDocument(orchester, tags, org);
		seedBusRentalDocument(orchester, tags, org);

		// Regular documents (no special status)
		seedPrinterTonerDocument(tags, org);
		seedElectricityBillDocument(root, org);

		// Standalone transaction (not linked to a document)
		seedMembershipFeeTransaction(root, org);
	}

	private Instant toInstant(LocalDate date)
	{
		return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
	}

	private record DemoTags(Tag buero, Tag musik, Tag veranstaltung, Tag reise, Tag verpflegung,
		Tag ausruestung)
	{
	}

	private DemoTags createDemoTags(Organization org)
	{
		Tag tagBuero = new Tag("Bürobedarf");
		tagBuero.setOrganization(org);
		Tag tagMusik = new Tag("Musik");
		tagMusik.setOrganization(org);
		Tag tagVeranstaltung = new Tag("Veranstaltung");
		tagVeranstaltung.setOrganization(org);
		Tag tagReise = new Tag("Reise");
		tagReise.setOrganization(org);
		Tag tagVerpflegung = new Tag("Verpflegung");
		tagVerpflegung.setOrganization(org);
		Tag tagAusruestung = new Tag("Ausrüstung");
		tagAusruestung.setOrganization(org);

		tagBuero.persist();
		tagMusik.persist();
		tagVeranstaltung.persist();
		tagReise.persist();
		tagVerpflegung.persist();
		tagAusruestung.persist();

		return new DemoTags(tagBuero, tagMusik, tagVeranstaltung, tagReise, tagVerpflegung,
			tagAusruestung);
	}

	private void seedOfficeSuppliesDocument(Bommel bommel, DemoTags tags, Organization org)
	{
		TradeParty sender = createTradeParty("Büro König GmbH", "Hauptstraße 42", "80331", "München",
			org);

		Document doc = new Document();
		doc.setName("Büromaterial");
		doc.setTotal(new BigDecimal("89.99"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 12, 15)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setOrganization(org);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.buero, TagSource.AI);
		documentRepository.persist(doc);
	}

	private void seedMusicEquipmentDocument(Bommel bommel, DemoTags tags, Organization org)
	{
		TradeParty sender = createTradeParty("Musikhaus Thomann", "Treppendorf 30", "96138",
			"Burgebrach", org);

		Document doc = new Document();
		doc.setName("Notenständer (5 Stück)");
		doc.setTotal(new BigDecimal("249.50"));
		doc.setTotalTax(new BigDecimal("39.83"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 12, 10)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setOrganization(org);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.musik, TagSource.AI);
		doc.addTag(tags.ausruestung, TagSource.AI);
		documentRepository.persist(doc);

		// Create transaction from document
		createTransactionFromDocument(doc, org, tags.musik, tags.ausruestung);
	}

	private void seedCateringDocument(Bommel bommel, DemoTags tags, Organization org)
	{
		TradeParty sender = createTradeParty("Metzgerei Huber", "Marktplatz 5", "85354", "Freising",
			org);

		Document doc = new Document();
		doc.setName("Catering Jugendtreffen");
		doc.setTotal(new BigDecimal("156.80"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 12, 8)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setOrganization(org);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.verpflegung, TagSource.AI);
		doc.addTag(tags.veranstaltung, TagSource.MANUAL);
		documentRepository.persist(doc);
	}

	private void seedBusRentalDocument(Bommel bommel, DemoTags tags, Organization org)
	{
		TradeParty sender = createTradeParty("Reisebus Schmidt", "Industriestraße 12", "80939",
			"München", org);

		Document doc = new Document();
		doc.setName("Busfahrt zum Wettbewerb");
		doc.setTotal(new BigDecimal("850.00"));
		doc.setTotalTax(new BigDecimal("135.71"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 11, 25)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setOrganization(org);
		doc.setPrivatelyPaid(true);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.reise, TagSource.AI);
		doc.addTag(tags.veranstaltung, TagSource.AI);
		documentRepository.persist(doc);

		// Create transaction from document
		createTransactionFromDocument(doc, org, tags.reise, tags.veranstaltung);
	}

	private void seedPrinterTonerDocument(DemoTags tags, Organization org)
	{
		TradeParty sender = createTradeParty("Amazon EU S.a.r.l.", "Marcel-Breuer-Str. 12", "80807",
			"München", org);

		Document doc = new Document();
		doc.setName("Drucker Toner");
		doc.setTotal(new BigDecimal("45.99"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 12, 20)));
		doc.setSender(sender);
		doc.setOrganization(org);
		// No bommel assigned
		doc.addTag(tags.buero, TagSource.AI);
		documentRepository.persist(doc);
	}

	private void seedElectricityBillDocument(Bommel bommel, Organization org)
	{
		TradeParty sender = createTradeParty("Stadtwerke München", "Emmy-Noether-Str. 2", "80992",
			"München", org);

		Document doc = new Document();
		doc.setName("Stromrechnung Q3 2024");
		doc.setTotal(new BigDecimal("342.67"));
		doc.setTotalTax(new BigDecimal("54.73"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 10, 1)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setOrganization(org);
		documentRepository.persist(doc);
	}

	private void seedMembershipFeeTransaction(Bommel bommel, Organization org)
	{
		TransactionRecord tx = new TransactionRecord(new BigDecimal("125.00"), "system");
		tx.setName("Mitgliedsbeitrag Januar 2025");
		tx.setTransactionTime(toInstant(LocalDate.of(2025, 1, 1)));
		tx.setBommel(bommel);
		tx.setOrganization(org);
		tx.setCurrencyCode("EUR");
		transactionRepository.persist(tx);
	}

	private TradeParty createTradeParty(String name, String street, String zipCode, String city,
		Organization org)
	{
		TradeParty party = new TradeParty();
		party.setName(name);
		party.setStreet(street);
		party.setZipCode(zipCode);
		party.setCity(city);
		party.setOrganization(org);
		party.persist();
		return party;
	}

	private void createTransactionFromDocument(Document doc, Organization org, Tag... tags)
	{
		TransactionRecord tx = new TransactionRecord(doc.getTotal(), "system");
		tx.setDocument(doc);
		tx.setName(doc.getName());
		tx.setTransactionTime(doc.getTransactionTime());
		tx.setBommel(doc.getBommel());
		tx.setOrganization(org);
		tx.setCurrencyCode(doc.getCurrencyCode());
		tx.setPrivatelyPaid(doc.isPrivatelyPaid());

		if (doc.getSender() != null)
		{
			TradeParty txSender = new TradeParty();
			txSender.setName(doc.getSender().getName());
			txSender.setStreet(doc.getSender().getStreet());
			txSender.setZipCode(doc.getSender().getZipCode());
			txSender.setCity(doc.getSender().getCity());
			txSender.setOrganization(org);
			tx.setSender(txSender);
		}

		for (Tag tag : tags)
		{
			tx.addTag(tag, app.hopps.transaction.domain.TagSource.AI);
		}

		transactionRepository.persist(tx);
	}

	@Transactional(Transactional.TxType.REQUIRES_NEW)
	public void bootstrapDefaultUsers()
	{
		Organization defaultOrg = getDefaultOrganization();

		// Bootstrap member1 (admin user) - link to DevServices Keycloak user
		Member member1 = memberRepository.findByEmail("member1@hopps.local");
		if (member1 == null)
		{
			// Find the Keycloak user created by DevServices (with retries for
			// timing)
			String keycloakUserId = findKeycloakUserWithRetry("member1", 5, 500);
			if (keycloakUserId != null)
			{
				member1 = new Member();
				member1.setFirstName("Maria");
				member1.setLastName("Admin");
				member1.setEmail("member1@hopps.local");
				member1.setPhone("+49 100 000001");
				member1.setOrganization(defaultOrg);
				member1.setKeycloakUserId(keycloakUserId);
				memberRepository.persist(member1);

				LOG.info("Bootstrapped member1: memberId={}, keycloakUserId={}",
					member1.getId(), member1.getKeycloakUserId());
			}
			else
			{
				LOG.warn("DevServices Keycloak user 'member1' not found. Skipping Member creation.");
			}
		}

		// Bootstrap member2 (regular user) - link to DevServices Keycloak user
		Member member2 = memberRepository.findByEmail("member2@hopps.local");
		if (member2 == null)
		{
			// Find the Keycloak user created by DevServices (with retries for
			// timing)
			String keycloakUserId = findKeycloakUserWithRetry("member2", 5, 500);
			if (keycloakUserId != null)
			{
				member2 = new Member();
				member2.setFirstName("Thomas");
				member2.setLastName("User");
				member2.setEmail("member2@hopps.local");
				member2.setPhone("+49 100 000002");
				member2.setOrganization(defaultOrg);
				member2.setKeycloakUserId(keycloakUserId);
				memberRepository.persist(member2);

				LOG.info("Bootstrapped member2: memberId={}, keycloakUserId={}",
					member2.getId(), member2.getKeycloakUserId());
			}
			else
			{
				LOG.warn("DevServices Keycloak user 'member2' not found. Skipping Member creation.");
			}
		}
	}

	/**
	 * Finds a Keycloak user by username with retry logic. DevServices may still
	 * be initializing users when this is called.
	 *
	 * @param username
	 *            The username to search for
	 * @param maxAttempts
	 *            Maximum number of retry attempts
	 * @param delayMs
	 *            Delay in milliseconds between retries
	 * @return The Keycloak user ID, or null if not found after all retries
	 */
	private String findKeycloakUserWithRetry(String username, int maxAttempts, long delayMs)
	{
		for (int attempt = 1; attempt <= maxAttempts; attempt++)
		{
			String userId = keycloakAdminService.findUserIdByUsername(username);
			if (userId != null)
			{
				if (attempt > 1)
				{
					LOG.info("Found Keycloak user '{}' on attempt {}", username, attempt);
				}
				return userId;
			}

			if (attempt < maxAttempts)
			{
				LOG.debug("Keycloak user '{}' not found, retrying in {}ms (attempt {}/{})",
					username, delayMs, attempt, maxAttempts);
				try
				{
					Thread.sleep(delayMs);
				}
				catch (InterruptedException e)
				{
					Thread.currentThread().interrupt();
					LOG.warn("Interrupted while waiting to retry finding Keycloak user '{}'", username);
					return null;
				}
			}
		}
		return null;
	}

	/**
	 * Gets the default organization. The bootstrap process ensures this always
	 * exists.
	 */
	private Organization getDefaultOrganization()
	{
		Organization org = organizationRepository.findBySlug("default");
		if (org == null)
		{
			throw new IllegalStateException(
				"Default organization not found. Bootstrap may not have run correctly.");
		}
		return org;
	}
}
