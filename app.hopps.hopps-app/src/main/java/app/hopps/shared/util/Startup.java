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
			// Only seed Bommels if none exist
			if (!bommelRepository.hasRoot())
			{
				// Create demo members
				Member maxMustermann = new Member();
				maxMustermann.setFirstName("Max");
				maxMustermann.setLastName("Mustermann");
				maxMustermann.setEmail("max.mustermann@example.com");
				maxMustermann.setPhone("+49 123 456789");
				memberRepository.persist(maxMustermann);

				Member lisaSchmidt = new Member();
				lisaSchmidt.setFirstName("Lisa");
				lisaSchmidt.setLastName("Schmidt");
				lisaSchmidt.setEmail("lisa.schmidt@example.com");
				memberRepository.persist(lisaSchmidt);

				// Create Bommels with assigned Bommelwarts
				Bommel root = new Bommel();
				root.setIcon("home");
				root.setTitle("Verein");
				root.setResponsibleMember(maxMustermann);
				bommelRepository.persist(root);

				Bommel jugend = new Bommel();
				jugend.setIcon("group");
				jugend.setTitle("Jugend");
				jugend.parent = root;
				jugend.setResponsibleMember(lisaSchmidt);
				bommelRepository.persist(jugend);

				Bommel orchester = new Bommel();
				orchester.setIcon("music");
				orchester.setTitle("Orchester");
				orchester.parent = root;
				bommelRepository.persist(orchester);

				Bommel anfaenger = new Bommel();
				anfaenger.setIcon("education");
				anfaenger.setTitle("Anfaenger");
				anfaenger.parent = jugend;
				bommelRepository.persist(anfaenger);

				// Create demo documents
				seedDocuments(root, jugend, orchester);
			}

			// Bootstrap alice and bob users (always in DEV mode)
			bootstrapDefaultUsers();
		}
	}

	private void seedDocuments(Bommel root, Bommel jugend, Bommel orchester)
	{
		DemoTags tags = createDemoTags();

		// Confirmed documents without transactions (will trigger transaction
		// creation alert)
		seedOfficeSuppliesDocument(root, tags);
		seedCateringDocument(jugend, tags);

		// Confirmed documents with transactions
		seedMusicEquipmentDocument(orchester, tags);
		seedBusRentalDocument(orchester, tags);

		// Regular documents (no special status)
		seedPrinterTonerDocument(tags);
		seedElectricityBillDocument(root);

		// Standalone transaction (not linked to a document)
		seedMembershipFeeTransaction(root);
	}

	private Instant toInstant(LocalDate date)
	{
		return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
	}

	private record DemoTags(Tag buero, Tag musik, Tag veranstaltung, Tag reise, Tag verpflegung,
		Tag ausruestung)
	{
	}

	private DemoTags createDemoTags()
	{
		Tag tagBuero = new Tag("Bürobedarf");
		Tag tagMusik = new Tag("Musik");
		Tag tagVeranstaltung = new Tag("Veranstaltung");
		Tag tagReise = new Tag("Reise");
		Tag tagVerpflegung = new Tag("Verpflegung");
		Tag tagAusruestung = new Tag("Ausrüstung");

		tagBuero.persist();
		tagMusik.persist();
		tagVeranstaltung.persist();
		tagReise.persist();
		tagVerpflegung.persist();
		tagAusruestung.persist();

		return new DemoTags(tagBuero, tagMusik, tagVeranstaltung, tagReise, tagVerpflegung,
			tagAusruestung);
	}

	private void seedOfficeSuppliesDocument(Bommel bommel, DemoTags tags)
	{
		TradeParty sender = createTradeParty("Büro König GmbH", "Hauptstraße 42", "80331", "München");

		Document doc = new Document();
		doc.setName("Büromaterial");
		doc.setTotal(new BigDecimal("89.99"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 12, 15)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.buero, TagSource.AI);
		documentRepository.persist(doc);
	}

	private void seedMusicEquipmentDocument(Bommel bommel, DemoTags tags)
	{
		TradeParty sender = createTradeParty("Musikhaus Thomann", "Treppendorf 30", "96138",
			"Burgebrach");

		Document doc = new Document();
		doc.setName("Notenständer (5 Stück)");
		doc.setTotal(new BigDecimal("249.50"));
		doc.setTotalTax(new BigDecimal("39.83"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 12, 10)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.musik, TagSource.AI);
		doc.addTag(tags.ausruestung, TagSource.AI);
		documentRepository.persist(doc);

		// Create transaction from document
		createTransactionFromDocument(doc, tags.musik, tags.ausruestung);
	}

	private void seedCateringDocument(Bommel bommel, DemoTags tags)
	{
		TradeParty sender = createTradeParty("Metzgerei Huber", "Marktplatz 5", "85354", "Freising");

		Document doc = new Document();
		doc.setName("Catering Jugendtreffen");
		doc.setTotal(new BigDecimal("156.80"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 12, 8)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.verpflegung, TagSource.AI);
		doc.addTag(tags.veranstaltung, TagSource.MANUAL);
		documentRepository.persist(doc);
	}

	private void seedBusRentalDocument(Bommel bommel, DemoTags tags)
	{
		TradeParty sender = createTradeParty("Reisebus Schmidt", "Industriestraße 12", "80939",
			"München");

		Document doc = new Document();
		doc.setName("Busfahrt zum Wettbewerb");
		doc.setTotal(new BigDecimal("850.00"));
		doc.setTotalTax(new BigDecimal("135.71"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 11, 25)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setPrivatelyPaid(true);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.reise, TagSource.AI);
		doc.addTag(tags.veranstaltung, TagSource.AI);
		documentRepository.persist(doc);

		// Create transaction from document
		createTransactionFromDocument(doc, tags.reise, tags.veranstaltung);
	}

	private void seedPrinterTonerDocument(DemoTags tags)
	{
		TradeParty sender = createTradeParty("Amazon EU S.a.r.l.", "Marcel-Breuer-Str. 12", "80807",
			"München");

		Document doc = new Document();
		doc.setName("Drucker Toner");
		doc.setTotal(new BigDecimal("45.99"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 12, 20)));
		doc.setSender(sender);
		// No bommel assigned
		doc.addTag(tags.buero, TagSource.AI);
		documentRepository.persist(doc);
	}

	private void seedElectricityBillDocument(Bommel bommel)
	{
		TradeParty sender = createTradeParty("Stadtwerke München", "Emmy-Noether-Str. 2", "80992",
			"München");

		Document doc = new Document();
		doc.setName("Stromrechnung Q3 2024");
		doc.setTotal(new BigDecimal("342.67"));
		doc.setTotalTax(new BigDecimal("54.73"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 10, 1)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		documentRepository.persist(doc);
	}

	private void seedMembershipFeeTransaction(Bommel bommel)
	{
		TransactionRecord tx = new TransactionRecord(new BigDecimal("125.00"), "system");
		tx.setName("Mitgliedsbeitrag Januar 2025");
		tx.setTransactionTime(toInstant(LocalDate.of(2025, 1, 1)));
		tx.setBommel(bommel);
		tx.setCurrencyCode("EUR");
		transactionRepository.persist(tx);
	}

	private TradeParty createTradeParty(String name, String street, String zipCode, String city)
	{
		TradeParty party = new TradeParty();
		party.setName(name);
		party.setStreet(street);
		party.setZipCode(zipCode);
		party.setCity(city);
		party.persist();
		return party;
	}

	private void createTransactionFromDocument(Document doc, Tag... tags)
	{
		TransactionRecord tx = new TransactionRecord(doc.getTotal(), "system");
		tx.setDocument(doc);
		tx.setName(doc.getName());
		tx.setTransactionTime(doc.getTransactionTime());
		tx.setBommel(doc.getBommel());
		tx.setCurrencyCode(doc.getCurrencyCode());
		tx.setPrivatelyPaid(doc.isPrivatelyPaid());

		if (doc.getSender() != null)
		{
			TradeParty txSender = new TradeParty();
			txSender.setName(doc.getSender().getName());
			txSender.setStreet(doc.getSender().getStreet());
			txSender.setZipCode(doc.getSender().getZipCode());
			txSender.setCity(doc.getSender().getCity());
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
		// Bootstrap alice (admin)
		Member alice = memberRepository.findByEmail("alice@hopps.local");
		if (alice == null)
		{
			alice = new Member();
			alice.setFirstName("Alice");
			alice.setLastName("Admin");
			alice.setEmail("alice@hopps.local");
			alice.setPhone("+49 100 000001");
			memberRepository.persist(alice);

			try
			{
				memberKeycloakSyncService.syncMemberToKeycloak(alice, List.of("admin"));
				LOG.info("Bootstrapped alice: memberId={}, keycloakUserId={}",
					alice.getId(), alice.getKeycloakUserId());
			}
			catch (Exception e)
			{
				LOG.error("Failed to sync alice to Keycloak", e);
			}
		}

		// Bootstrap bob (user)
		Member bob = memberRepository.findByEmail("bob@hopps.local");
		if (bob == null)
		{
			bob = new Member();
			bob.setFirstName("Bob");
			bob.setLastName("User");
			bob.setEmail("bob@hopps.local");
			bob.setPhone("+49 100 000002");
			memberRepository.persist(bob);

			try
			{
				memberKeycloakSyncService.syncMemberToKeycloak(bob);
				LOG.info("Bootstrapped bob: memberId={}, keycloakUserId={}",
					bob.getId(), bob.getKeycloakUserId());
			}
			catch (Exception e)
			{
				LOG.error("Failed to sync bob to Keycloak", e);
			}
		}
	}
}
