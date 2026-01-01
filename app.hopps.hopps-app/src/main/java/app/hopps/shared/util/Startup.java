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
		// Create tags
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

		// Document 1: Receipt from office supply store
		TradeParty sender1 = new TradeParty();
		sender1.setName("Büro König GmbH");
		sender1.setStreet("Hauptstraße 42");
		sender1.setZipCode("80331");
		sender1.setCity("München");
		sender1.persist();

		Document doc1 = new Document();
		doc1.setName("Büromaterial");
		doc1.setTotal(new BigDecimal("89.99"));
		doc1.setCurrencyCode("EUR");
		doc1.setTransactionTime(toInstant(LocalDate.of(2024, 12, 15)));
		doc1.setSender(sender1);
		doc1.setBommel(root);
		doc1.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc1.addTag(tagBuero, TagSource.AI);
		documentRepository.persist(doc1);

		// Document 2: Invoice for music equipment
		TradeParty sender2 = new TradeParty();
		sender2.setName("Musikhaus Thomann");
		sender2.setStreet("Treppendorf 30");
		sender2.setZipCode("96138");
		sender2.setCity("Burgebrach");
		sender2.persist();

		Document doc2 = new Document();
		doc2.setName("Notenständer (5 Stück)");
		doc2.setTotal(new BigDecimal("249.50"));
		doc2.setTotalTax(new BigDecimal("39.83"));
		doc2.setCurrencyCode("EUR");
		doc2.setTransactionTime(toInstant(LocalDate.of(2024, 12, 10)));
		doc2.setSender(sender2);
		doc2.setBommel(orchester);
		doc2.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc2.addTag(tagMusik, TagSource.AI);
		doc2.addTag(tagAusruestung, TagSource.AI);
		documentRepository.persist(doc2);

		// Create transaction from doc2
		TransactionRecord tx1 = new TransactionRecord(doc2.getTotal(), "system");
		tx1.setDocument(doc2);
		tx1.setName(doc2.getName());
		tx1.setTransactionTime(doc2.getTransactionTime());
		tx1.setBommel(doc2.getBommel());
		tx1.setCurrencyCode(doc2.getCurrencyCode());
		if (doc2.getSender() != null)
		{
			TradeParty txSender = new TradeParty();
			txSender.setName(doc2.getSender().getName());
			txSender.setStreet(doc2.getSender().getStreet());
			txSender.setZipCode(doc2.getSender().getZipCode());
			txSender.setCity(doc2.getSender().getCity());
			tx1.setSender(txSender);
		}
		tx1.addTag(tagMusik, app.hopps.transaction.domain.TagSource.AI);
		tx1.addTag(tagAusruestung, app.hopps.transaction.domain.TagSource.AI);
		transactionRepository.persist(tx1);

		// Document 3: Receipt for catering
		TradeParty sender3 = new TradeParty();
		sender3.setName("Metzgerei Huber");
		sender3.setStreet("Marktplatz 5");
		sender3.setZipCode("85354");
		sender3.setCity("Freising");
		sender3.persist();

		Document doc3 = new Document();
		doc3.setName("Catering Jugendtreffen");
		doc3.setTotal(new BigDecimal("156.80"));
		doc3.setCurrencyCode("EUR");
		doc3.setTransactionTime(toInstant(LocalDate.of(2024, 12, 8)));
		doc3.setSender(sender3);
		doc3.setBommel(jugend);
		doc3.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc3.addTag(tagVerpflegung, TagSource.AI);
		doc3.addTag(tagVeranstaltung, TagSource.MANUAL);
		documentRepository.persist(doc3);

		// Document 4: Invoice for bus rental (privately paid)
		TradeParty sender4 = new TradeParty();
		sender4.setName("Reisebus Schmidt");
		sender4.setStreet("Industriestraße 12");
		sender4.setZipCode("80939");
		sender4.setCity("München");
		sender4.persist();

		Document doc4 = new Document();
		doc4.setName("Busfahrt zum Wettbewerb");
		doc4.setTotal(new BigDecimal("850.00"));
		doc4.setTotalTax(new BigDecimal("135.71"));
		doc4.setCurrencyCode("EUR");
		doc4.setTransactionTime(toInstant(LocalDate.of(2024, 11, 25)));
		doc4.setSender(sender4);
		doc4.setBommel(orchester);
		doc4.setPrivatelyPaid(true);
		doc4.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc4.addTag(tagReise, TagSource.AI);
		doc4.addTag(tagVeranstaltung, TagSource.AI);
		documentRepository.persist(doc4);

		// Create transaction from doc4
		TransactionRecord tx2 = new TransactionRecord(doc4.getTotal(), "system");
		tx2.setDocument(doc4);
		tx2.setName(doc4.getName());
		tx2.setTransactionTime(doc4.getTransactionTime());
		tx2.setBommel(doc4.getBommel());
		tx2.setCurrencyCode(doc4.getCurrencyCode());
		tx2.setPrivatelyPaid(true);
		if (doc4.getSender() != null)
		{
			TradeParty txSender2 = new TradeParty();
			txSender2.setName(doc4.getSender().getName());
			txSender2.setStreet(doc4.getSender().getStreet());
			txSender2.setZipCode(doc4.getSender().getZipCode());
			txSender2.setCity(doc4.getSender().getCity());
			tx2.setSender(txSender2);
		}
		tx2.addTag(tagReise, app.hopps.transaction.domain.TagSource.AI);
		tx2.addTag(tagVeranstaltung, app.hopps.transaction.domain.TagSource.AI);
		transactionRepository.persist(tx2);

		// Document 5: Receipt without bommel assignment
		TradeParty sender5 = new TradeParty();
		sender5.setName("Amazon EU S.a.r.l.");
		sender5.setStreet("Marcel-Breuer-Str. 12");
		sender5.setZipCode("80807");
		sender5.setCity("München");
		sender5.persist();

		Document doc5 = new Document();
		doc5.setName("Drucker Toner");
		doc5.setTotal(new BigDecimal("45.99"));
		doc5.setCurrencyCode("EUR");
		doc5.setTransactionTime(toInstant(LocalDate.of(2024, 12, 20)));
		doc5.setSender(sender5);
		// No bommel assigned
		doc5.addTag(tagBuero, TagSource.AI);
		documentRepository.persist(doc5);

		// Document 6: Old invoice
		TradeParty sender6 = new TradeParty();
		sender6.setName("Stadtwerke München");
		sender6.setStreet("Emmy-Noether-Str. 2");
		sender6.setZipCode("80992");
		sender6.setCity("München");
		sender6.persist();

		Document doc6 = new Document();
		doc6.setName("Stromrechnung Q3 2024");
		doc6.setTotal(new BigDecimal("342.67"));
		doc6.setTotalTax(new BigDecimal("54.73"));
		doc6.setCurrencyCode("EUR");
		doc6.setTransactionTime(toInstant(LocalDate.of(2024, 10, 1)));
		doc6.setSender(sender6);
		doc6.setBommel(root);
		documentRepository.persist(doc6);

		// Create a standalone transaction (not linked to a document)
		TransactionRecord tx3 = new TransactionRecord(new BigDecimal("125.00"), "system");
		tx3.setName("Mitgliedsbeitrag Januar 2025");
		tx3.setTransactionTime(toInstant(LocalDate.of(2025, 1, 1)));
		tx3.setBommel(root);
		tx3.setCurrencyCode("EUR");
		transactionRepository.persist(tx3);
	}

	private Instant toInstant(LocalDate date)
	{
		return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
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
