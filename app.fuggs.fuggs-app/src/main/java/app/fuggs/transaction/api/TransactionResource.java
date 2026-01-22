package app.fuggs.transaction.api;

import app.fuggs.bommel.domain.Bommel;
import app.fuggs.bommel.repository.BommelRepository;
import app.fuggs.document.domain.TradeParty;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.domain.Tag;
import app.fuggs.shared.repository.TagRepository;
import app.fuggs.shared.security.OrganizationContext;
import app.fuggs.shared.util.FlashKeys;
import app.fuggs.transaction.domain.TagSource;
import app.fuggs.transaction.domain.TransactionRecord;
import app.fuggs.transaction.domain.TransactionTag;
import app.fuggs.transaction.repository.TransactionRecordRepository;
import io.quarkiverse.renarde.Controller;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.RestQuery;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Authenticated
@Path("/transaktionen")
public class TransactionResource extends Controller
{
	private static final Logger LOG = LoggerFactory.getLogger(TransactionResource.class);

	@Inject
	TransactionRecordRepository transactionRepository;

	@Inject
	BommelRepository bommelRepository;

	@Inject
	TagRepository tagRepository;

	@Inject
	SecurityIdentity securityIdentity;

	@Inject
	OrganizationContext organizationContext;

	@CheckedTemplate
	public static class Templates
	{
		private Templates()
		{
			// static
		}

		public static native TemplateInstance index(List<TransactionRecord> transactions);

		public static native TemplateInstance create(List<Bommel> bommels);

		public static native TemplateInstance show(TransactionRecord transaction, List<Bommel> bommels);
	}

	@GET
	@Path("")
	public TemplateInstance index(@RestQuery Long bommelId, @RestQuery Long documentId)
	{
		List<TransactionRecord> transactions;
		if (documentId != null)
		{
			transactions = transactionRepository.findByDocument(documentId);
		}
		else if (bommelId != null)
		{
			transactions = transactionRepository.findByBommel(bommelId);
		}
		else
		{
			transactions = transactionRepository.findAllOrderedByDate();
		}

		return Templates.index(transactions);
	}

	@GET
	@Path("/neu")
	public TemplateInstance create()
	{
		List<Bommel> bommels = bommelRepository.listAll();
		return Templates.create(bommels);
	}

	@POST
	@Transactional
	@Path("/create")
	public void save(
		@RestForm @NotNull BigDecimal total,
		@RestForm String name,
		@RestForm String transactionDate,
		@RestForm Long bommelId,
		@RestForm String senderName,
		@RestForm String senderStreet,
		@RestForm String senderZipCode,
		@RestForm String senderCity,
		@RestForm boolean privatelyPaid,
		@RestForm String currencyCode,
		@RestForm String tags)
	{
		// Get current organization
		Organization currentOrg = organizationContext.getCurrentOrganization();
		if (currentOrg == null)
		{
			flash(FlashKeys.ERROR, "Keine Organisation gefunden");
			redirect(TransactionResource.class).index(null, null);
			return;
		}

		// Create transaction
		TransactionRecord transaction = new TransactionRecord(
			total,
			securityIdentity.getPrincipal().getName());

		// Set organization
		transaction.setOrganization(currentOrg);

		// Set core fields
		transaction.setName(name);
		transaction.setPrivatelyPaid(privatelyPaid);
		transaction.setCurrencyCode(currencyCode != null && !currencyCode.isBlank() ? currencyCode : "EUR");

		// Parse and set transaction date
		if (transactionDate != null && !transactionDate.isBlank())
		{
			LocalDate date = LocalDate.parse(transactionDate);
			transaction.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
		}

		// Set bommel
		if (bommelId != null && bommelId > 0)
		{
			Bommel bommel = bommelRepository.findByIdScoped(bommelId);
			transaction.setBommel(bommel);
		}

		// Set sender
		if (senderName != null && !senderName.isBlank())
		{
			TradeParty sender = new TradeParty();
			sender.setName(senderName);
			sender.setStreet(senderStreet);
			sender.setZipCode(senderZipCode);
			sender.setCity(senderCity);
			sender.setOrganization(currentOrg);
			transaction.setSender(sender);
		}

		// Persist transaction
		transactionRepository.persist(transaction);

		// Add tags
		updateTransactionTags(transaction, tags);

		flash(FlashKeys.SUCCESS, "Transaktion erstellt");
		redirect(TransactionResource.class).show(transaction.getId());
	}

	@GET
	@Path("/{id}")
	public TemplateInstance show(Long id)
	{
		TransactionRecord transaction = transactionRepository.findByIdScoped(id);
		if (transaction == null)
		{
			flash(FlashKeys.ERROR, "Transaktion nicht gefunden");
			redirect(TransactionResource.class).index(null, null);
			return null;
		}
		List<Bommel> bommels = bommelRepository.listAll();
		return Templates.show(transaction, bommels);
	}

	@POST
	@Transactional
	public void update(
		@RestForm @NotNull Long id,
		@RestForm @NotNull BigDecimal total,
		@RestForm String name,
		@RestForm String transactionDate,
		@RestForm Long bommelId,
		@RestForm String senderName,
		@RestForm String senderStreet,
		@RestForm String senderZipCode,
		@RestForm String senderCity,
		@RestForm boolean privatelyPaid,
		@RestForm String currencyCode,
		@RestForm String tags)
	{
		TransactionRecord transaction = transactionRepository.findByIdScoped(id);
		if (transaction == null)
		{
			flash(FlashKeys.ERROR, "Transaktion nicht gefunden");
			redirect(TransactionResource.class).index(null, null);
			return;
		}

		// Update core fields
		transaction.setTotal(total);
		transaction.setName(name);
		transaction.setPrivatelyPaid(privatelyPaid);
		transaction.setCurrencyCode(currencyCode != null && !currencyCode.isBlank() ? currencyCode : "EUR");

		// Parse and set transaction date
		if (transactionDate != null && !transactionDate.isBlank())
		{
			LocalDate date = LocalDate.parse(transactionDate);
			transaction.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
		}
		else
		{
			transaction.setTransactionTime(null);
		}

		// Update bommel
		if (bommelId != null && bommelId > 0)
		{
			Bommel bommel = bommelRepository.findByIdScoped(bommelId);
			transaction.setBommel(bommel);
		}
		else
		{
			transaction.setBommel(null);
		}

		// Update sender
		if (senderName != null && !senderName.isBlank())
		{
			if (transaction.getSender() == null)
			{
				TradeParty sender = new TradeParty();
				sender.setOrganization(transaction.getOrganization());
				transaction.setSender(sender);
			}
			transaction.getSender().setName(senderName);
			transaction.getSender().setStreet(senderStreet);
			transaction.getSender().setZipCode(senderZipCode);
			transaction.getSender().setCity(senderCity);
		}
		else
		{
			transaction.setSender(null);
		}

		// Update tags
		updateTransactionTags(transaction, tags);

		flash(FlashKeys.SUCCESS, "Transaktion aktualisiert");
		redirect(TransactionResource.class).show(transaction.getId());
	}

	@POST
	@Transactional
	public void delete(@RestForm @NotNull Long id)
	{
		TransactionRecord transaction = transactionRepository.findByIdScoped(id);
		if (transaction == null)
		{
			flash(FlashKeys.ERROR, "Transaktion nicht gefunden");
			redirect(TransactionResource.class).index(null, null);
			return;
		}

		transactionRepository.delete(transaction);

		flash(FlashKeys.SUCCESS, "Transaktion gelöscht");
		redirect(TransactionResource.class).index(null, null);
	}

	private void updateTransactionTags(TransactionRecord transaction, String tagsInput)
	{
		if (tagsInput == null || tagsInput.isBlank())
		{
			// Remove all manual tags, keep AI tags
			transaction.getTransactionTags().removeIf(TransactionTag::isManual);
			return;
		}

		// Parse comma-separated tags
		Set<String> tagNames = Arrays.stream(tagsInput.split(","))
			.map(String::trim)
			.filter(s -> !s.isEmpty())
			.collect(Collectors.toSet());

		// Find or create tags
		Set<Tag> newTags = tagRepository.findOrCreateTags(tagNames);

		// Remove manual tags not in new set
		transaction.getTransactionTags().removeIf(tt -> {
			if (tt.isManual())
			{
				return newTags.stream().noneMatch(tag -> tag.getName().equalsIgnoreCase(tt.getName()));
			}
			return false; // Keep AI tags
		});

		// Add new tags as MANUAL (avoid duplicates)
		for (Tag tag : newTags)
		{
			transaction.addTag(tag, TagSource.MANUAL);
		}
	}
}
