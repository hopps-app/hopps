package app.hopps.shared.bootstrap;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
import app.hopps.shared.bootstrap.config.BootstrapData;
import app.hopps.shared.bootstrap.config.BootstrapData.BommelData;
import app.hopps.shared.bootstrap.config.BootstrapData.DemoData;
import app.hopps.shared.bootstrap.config.BootstrapData.DocumentData;
import app.hopps.shared.bootstrap.config.BootstrapData.MemberData;
import app.hopps.shared.bootstrap.config.BootstrapData.OrganizationData;
import app.hopps.shared.bootstrap.config.BootstrapData.TagData;
import app.hopps.shared.bootstrap.config.BootstrapData.TransactionData;
import app.hopps.shared.domain.Tag;
import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.transaction.repository.TransactionRecordRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Seeds demo data for development mode based on YAML configuration. Creates
 * demo members, bommels, tags, documents, and transactions for each
 * organization that has demo data configured.
 */
@ApplicationScoped
public class DataSeeder
{
	private static final Logger LOG = LoggerFactory.getLogger(DataSeeder.class);
	private static final String ROOT_REF = "root";

	@Inject
	BommelRepository bommelRepository;

	@Inject
	MemberRepository memberRepository;

	@Inject
	DocumentRepository documentRepository;

	@Inject
	TransactionRecordRepository transactionRepository;

	@Inject
	BootstrapData bootstrapData;

	/**
	 * Seeds demo data for all organizations that have demo configuration.
	 *
	 * @param orgs
	 *            List of organizations to seed
	 */
	@Transactional
	public void seedDemoData(List<Organization> orgs)
	{
		for (Organization org : orgs)
		{
			// Find config for this organization
			bootstrapData.getOrganizations().stream()
				.filter(c -> c.getSlug().equals(org.getSlug())).findFirst()
				.map(OrganizationData::getDemo).ifPresent(demo -> seedFromConfig(org, demo));
		}
	}

	/**
	 * Seeds demo data for a single organization from configuration.
	 */
	private void seedFromConfig(Organization org, DemoData demo)
	{
		if (demo == null)
		{
			return;
		}

		// Check if already seeded by looking for first demo member
		if (!demo.getMembers().isEmpty())
		{
			String firstUsername = demo.getMembers().get(0).getUsername();
			if (memberRepository.findByUsername(firstUsername) != null)
			{
				LOG.debug("Demo data already seeded for organization: {}", org.getName());
				return;
			}
		}

		LOG.info("Seeding demo data for organization: {}", org.getName());

		// Create members first (needed for bommel responsibilities)
		Map<String, Member> membersByUsername = new HashMap<>();
		for (MemberData memberData : demo.getMembers())
		{
			Member member = createMember(memberData, org);
			membersByUsername.put(memberData.getUsername(), member);
		}

		// Find root bommel
		Bommel root = findRootBommel(org);

		// Create bommels (need to handle parent references)
		Map<String, Bommel> bommelsByRef = new HashMap<>();
		bommelsByRef.put(ROOT_REF, root);
		for (BommelData bommelData : demo.getBommels())
		{
			Bommel parent = bommelsByRef.get(bommelData.getParentRef());
			if (parent == null)
			{
				LOG.warn("Parent bommel '{}' not found for bommel '{}', using root",
					bommelData.getParentRef(), bommelData.getRef());
				parent = root;
			}

			Member responsibleMember = bommelData.getResponsibleMember() != null
				? membersByUsername.get(bommelData.getResponsibleMember())
				: null;

			Bommel bommel = createBommel(bommelData, parent, responsibleMember, org);
			bommelsByRef.put(bommelData.getRef(), bommel);
		}

		// Create tags
		Map<String, Tag> tagsByRef = new HashMap<>();
		for (TagData tagData : demo.getTags())
		{
			Tag tag = createTag(tagData, org);
			tagsByRef.put(tagData.getRef(), tag);
		}

		// Create documents
		for (DocumentData docData : demo.getDocuments())
		{
			Bommel bommel = docData.getBommelRef() != null
				? bommelsByRef.get(docData.getBommelRef())
				: null;
			List<Tag> docTags = docData.getTagRefs() != null
				? Arrays.stream(docData.getTagRefs().split(",")).map(String::trim)
					.map(tagsByRef::get).filter(t -> t != null).toList()
				: List.of();

			Document doc = createDocument(docData, bommel, docTags, org);

			// Create transaction if configured
			if (docData.isCreateTransaction())
			{
				createTransactionFromDocument(doc, docTags, org);
			}
		}

		// Create standalone transactions
		for (TransactionData txData : demo.getTransactions())
		{
			Bommel bommel = txData.getBommelRef() != null
				? bommelsByRef.get(txData.getBommelRef())
				: root;
			createTransaction(txData, bommel, org);
		}

		LOG.info(
			"Seeded demo data for organization: {} ({} members, {} bommels, {} tags, {} documents, {} transactions)",
			org.getName(), demo.getMembers().size(), demo.getBommels().size(),
			demo.getTags().size(), demo.getDocuments().size(), demo.getTransactions().size());
	}

	private Bommel findRootBommel(Organization org)
	{
		return bommelRepository.find("parent is null and organization.id = ?1", org.id).firstResult();
	}

	private Member createMember(MemberData data, Organization org)
	{
		Member member = new Member();
		member.setFirstName(data.getFirstName());
		member.setLastName(data.getLastName());
		member.setUserName(data.getUsername());
		member.setEmail(data.getEmail());
		member.setPhone(data.getPhone());
		member.setOrganization(org);
		memberRepository.persist(member);
		return member;
	}

	private Bommel createBommel(BommelData data, Bommel parent, Member responsibleMember,
		Organization org)
	{
		Bommel bommel = new Bommel();
		bommel.setIcon(data.getIcon());
		bommel.setTitle(data.getTitle());
		bommel.setResponsibleMember(responsibleMember);
		bommel.parent = parent;
		bommel.setOrganization(org);
		bommelRepository.persist(bommel);
		return bommel;
	}

	private Tag createTag(TagData data, Organization org)
	{
		Tag tag = new Tag(data.getName());
		tag.setOrganization(org);
		tag.persist();
		return tag;
	}

	private Document createDocument(DocumentData data, Bommel bommel, List<Tag> tags, Organization org)
	{
		Document doc = new Document();
		doc.setName(data.getName());
		doc.setTotal(new BigDecimal(data.getTotal()));
		if (data.getTotalTax() != null)
		{
			doc.setTotalTax(new BigDecimal(data.getTotalTax()));
		}
		doc.setCurrencyCode(data.getCurrencyCode());
		doc.setTransactionTime(toInstant(LocalDate.parse(data.getDate())));
		doc.setBommel(bommel);
		doc.setOrganization(org);
		doc.setPrivatelyPaid(data.isPrivatelyPaid());

		if (data.isConfirmed())
		{
			doc.setDocumentStatus(DocumentStatus.CONFIRMED);
		}

		// Add tags
		for (Tag tag : tags)
		{
			doc.addTag(tag, TagSource.AI);
		}

		// Create sender if configured
		if (data.getSender() != null)
		{
			TradeParty sender = new TradeParty();
			sender.setName(data.getSender().getName());
			sender.setStreet(data.getSender().getStreet());
			sender.setZipCode(data.getSender().getZipCode());
			sender.setCity(data.getSender().getCity());
			sender.setOrganization(org);
			sender.persist();
			doc.setSender(sender);
		}

		documentRepository.persist(doc);
		return doc;
	}

	private void createTransactionFromDocument(Document doc, List<Tag> tags, Organization org)
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

	private void createTransaction(TransactionData data, Bommel bommel, Organization org)
	{
		TransactionRecord tx = new TransactionRecord(new BigDecimal(data.getAmount()), "system");
		tx.setName(data.getName());
		tx.setTransactionTime(toInstant(LocalDate.parse(data.getDate())));
		tx.setBommel(bommel);
		tx.setOrganization(org);
		tx.setCurrencyCode(data.getCurrencyCode());
		transactionRepository.persist(tx);
	}

	private Instant toInstant(LocalDate date)
	{
		return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
	}
}
