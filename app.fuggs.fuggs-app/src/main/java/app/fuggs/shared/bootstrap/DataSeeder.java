package app.fuggs.shared.bootstrap;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.fuggs.bommel.domain.Bommel;
import app.fuggs.bommel.repository.BommelRepository;
import app.fuggs.document.domain.Document;
import app.fuggs.document.domain.DocumentStatus;
import app.fuggs.document.domain.TagSource;
import app.fuggs.document.domain.TradeParty;
import app.fuggs.document.repository.DocumentRepository;
import app.fuggs.member.domain.Member;
import app.fuggs.member.repository.MemberRepository;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.domain.Tag;
import app.fuggs.transaction.domain.TransactionRecord;
import app.fuggs.transaction.repository.TransactionRecordRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Seeds demo data for development mode. Creates demo members, bommels,
 * documents, and transactions for each organization.
 */
@ApplicationScoped
public class DataSeeder
{
	private static final Logger LOG = LoggerFactory.getLogger(DataSeeder.class);

	@Inject
	BommelRepository bommelRepository;

	@Inject
	MemberRepository memberRepository;

	@Inject
	DocumentRepository documentRepository;

	@Inject
	TransactionRecordRepository transactionRepository;

	/**
	 * Seeds demo data for all organizations.
	 *
	 * @param orgs
	 *            List of organizations to seed
	 */
	@Transactional
	public void seedDemoData(List<Organization> orgs)
	{
		for (Organization org : orgs)
		{
			if ("musikverein-harmonie".equals(org.getSlug()))
			{
				seedMusikvereinsDemo(org);
			}
			else if ("sportverein-alpenblick".equals(org.getSlug()))
			{
				seedSportvereinDemo(org);
			}
		}
	}

	/**
	 * Seeds demo data for Musikverein Harmonie organization.
	 */
	private void seedMusikvereinsDemo(Organization org)
	{
		// Only seed if demo member doesn't exist yet
		if (memberRepository.findByUsername("max.mustermann") == null)
		{
			// Create demo members (NOT auth-linked)
			createMember("Max", "Mustermann", "max.mustermann",
				"max.mustermann@harmonie.local", "+49 89 123456", org);
			Member secondaryMember = createMember("Lisa", "Schmidt", "lisa.schmidt",
				"lisa.schmidt@harmonie.local", null, org);

			// Find root bommel created by BootstrapService
			Bommel root = findRootBommel(org);

			// Create Bommels
			Bommel jugend = createBommel("group", "Jugend", secondaryMember, root, org);
			Bommel orchester = createBommel("music", "Orchester", null, root, org);
			createBommel("education", "Anfaenger", null, jugend, org);

			// Create demo documents
			seedDocuments(root, jugend, orchester, org);

			LOG.info("Seeded demo data for organization: {}", org.getName());
		}
	}

	/**
	 * Seeds demo data for Sportverein Alpenblick organization.
	 */
	private void seedSportvereinDemo(Organization org)
	{
		// Only seed if demo member doesn't exist yet
		if (memberRepository.findByUsername("anna.weber") == null)
		{
			// Create demo members (NOT auth-linked)
			Member primaryMember = createMember("Anna", "Weber", "anna.weber",
				"anna.weber@alpenblick.local", "+49 8051 987654", org);
			Member secondaryMember = createMember("Peter", "Huber", "peter.huber",
				"peter.huber@alpenblick.local", null, org);

			// Find root bommel created by BootstrapService
			Bommel root = findRootBommel(org);

			// Create Bommels
			Bommel fussball = createBommel("soccer", "Fußball", secondaryMember, root, org);
			Bommel volleyball = createBommel("volleyball", "Volleyball", null, root, org);
			Bommel jugend = createBommel("group", "Jugend", null, fussball, org);

			// Create demo documents for sports club
			seedSportsDocuments(root, fussball, volleyball, org);

			LOG.info("Seeded demo data for organization: {}", org.getName());
		}
	}

	/**
	 * Finds the root bommel for an organization (created by BootstrapService).
	 */
	private Bommel findRootBommel(Organization org)
	{
		return bommelRepository.find("parent is null and organization.id = ?1", org.id).firstResult();
	}

	/**
	 * Creates and persists a Member entity.
	 */
	private Member createMember(String firstName, String lastName, String userName, String email,
		String phone, Organization org)
	{
		Member member = new Member();
		member.setFirstName(firstName);
		member.setLastName(lastName);
		member.setUserName(userName);
		member.setEmail(email);
		member.setPhone(phone);
		member.setOrganization(org);
		memberRepository.persist(member);
		return member;
	}

	/**
	 * Creates and persists a Bommel entity.
	 */
	private Bommel createBommel(String icon, String title, Member responsibleMember, Bommel parent,
		Organization org)
	{
		Bommel bommel = new Bommel();
		bommel.setIcon(icon);
		bommel.setTitle(title);
		bommel.setResponsibleMember(responsibleMember);
		bommel.parent = parent;
		bommel.setOrganization(org);
		bommelRepository.persist(bommel);
		return bommel;
	}

	private void seedDocuments(Bommel root, Bommel jugend, Bommel orchester, Organization org)
	{
		DemoTags tags = createDemoTags(org);

		// Confirmed documents without transactions
		seedOfficeSuppliesDocument(root, tags, org);
		seedCateringDocument(jugend, tags, org);

		// Confirmed documents with transactions
		seedMusicEquipmentDocument(orchester, tags, org);
		seedBusRentalDocument(orchester, tags, org);

		// Regular documents
		seedPrinterTonerDocument(tags, org);
		seedElectricityBillDocument(root, org);

		// Standalone transaction
		seedMembershipFeeTransaction(root, org);
	}

	private void seedSportsDocuments(Bommel root, Bommel fussball, Bommel volleyball,
		Organization org)
	{
		SportsTags tags = createSportsTags(org);

		// Sports equipment
		seedSportsEquipmentDocument(fussball, tags, org);
		seedTournamentRegistrationDocument(fussball, tags, org);

		// Venue rental
		seedHallRentalDocument(volleyball, tags, org);

		// General expenses
		seedSportsInsuranceDocument(root, org);
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

	private record SportsTags(Tag ausruestung, Tag turnier, Tag hallenvermietung, Tag versicherung)
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

	private SportsTags createSportsTags(Organization org)
	{
		Tag tagAusruestung = new Tag("Ausrüstung");
		tagAusruestung.setOrganization(org);
		Tag tagTurnier = new Tag("Turnier");
		tagTurnier.setOrganization(org);
		Tag tagHallenvermietung = new Tag("Hallenvermietung");
		tagHallenvermietung.setOrganization(org);
		Tag tagVersicherung = new Tag("Versicherung");
		tagVersicherung.setOrganization(org);

		tagAusruestung.persist();
		tagTurnier.persist();
		tagHallenvermietung.persist();
		tagVersicherung.persist();

		return new SportsTags(tagAusruestung, tagTurnier, tagHallenvermietung, tagVersicherung);
	}

	// Music club documents

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

	// Sports club documents

	private void seedSportsEquipmentDocument(Bommel bommel, SportsTags tags, Organization org)
	{
		TradeParty sender = createTradeParty("Sport Schuster", "Rosenstraße 1-5", "80331", "München",
			org);

		Document doc = new Document();
		doc.setName("Fußbälle (10 Stück)");
		doc.setTotal(new BigDecimal("189.90"));
		doc.setTotalTax(new BigDecimal("30.33"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 12, 5)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setOrganization(org);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.ausruestung, TagSource.AI);
		documentRepository.persist(doc);

		createTransactionFromDocument(doc, org, tags.ausruestung);
	}

	private void seedTournamentRegistrationDocument(Bommel bommel, SportsTags tags, Organization org)
	{
		TradeParty sender = createTradeParty("Bayerischer Fußballverband", "Brienner Str. 50",
			"80333", "München", org);

		Document doc = new Document();
		doc.setName("Turnieranmeldung Jugendcup");
		doc.setTotal(new BigDecimal("120.00"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 11, 28)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setOrganization(org);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.turnier, TagSource.AI);
		documentRepository.persist(doc);
	}

	private void seedHallRentalDocument(Bommel bommel, SportsTags tags, Organization org)
	{
		TradeParty sender = createTradeParty("Gemeinde Alpenblick", "Rathausplatz 1", "83703",
			"Gmund", org);

		Document doc = new Document();
		doc.setName("Hallenmiete Dezember");
		doc.setTotal(new BigDecimal("450.00"));
		doc.setTotalTax(new BigDecimal("71.85"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2024, 12, 1)));
		doc.setSender(sender);
		doc.setBommel(bommel);
		doc.setOrganization(org);
		doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		doc.addTag(tags.hallenvermietung, TagSource.AI);
		documentRepository.persist(doc);

		createTransactionFromDocument(doc, org, tags.hallenvermietung);
	}

	private void seedSportsInsuranceDocument(Bommel bommel, Organization org)
	{
		TradeParty sender = createTradeParty("ARAG Sportversicherung", "ARAG-Platz 1", "40472",
			"Düsseldorf", org);

		Document doc = new Document();
		doc.setName("Vereinsversicherung 2025");
		doc.setTotal(new BigDecimal("680.00"));
		doc.setTotalTax(new BigDecimal("108.57"));
		doc.setCurrencyCode("EUR");
		doc.setTransactionTime(toInstant(LocalDate.of(2025, 1, 1)));
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
			tx.addTag(tag, app.fuggs.transaction.domain.TagSource.AI);
		}

		transactionRepository.persist(tx);
	}
}
