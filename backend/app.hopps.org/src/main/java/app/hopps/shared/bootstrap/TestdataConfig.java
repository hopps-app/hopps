package app.hopps.shared.bootstrap;

import java.util.List;
import java.util.Map;

/**
 * Root configuration class for testdata YAML file. Maps directly to the YAML structure.
 */
public class TestdataConfig {

    private List<OrganizationData> organizations;
    private List<MemberData> members;
    private List<BommelData> bommels;
    private List<TransactionData> transactions;
    private List<DocumentData> documents;
    private List<BankAccountData> bankAccounts;
    private List<BankTransactionData> bankTransactions;
    private Map<String, Long> sequences;

    public List<OrganizationData> getOrganizations() {
        return organizations;
    }

    public void setOrganizations(List<OrganizationData> organizations) {
        this.organizations = organizations;
    }

    public List<MemberData> getMembers() {
        return members;
    }

    public void setMembers(List<MemberData> members) {
        this.members = members;
    }

    public List<BommelData> getBommels() {
        return bommels;
    }

    public void setBommels(List<BommelData> bommels) {
        this.bommels = bommels;
    }

    public List<TransactionData> getTransactions() {
        return transactions;
    }

    public void setTransactions(List<TransactionData> transactions) {
        this.transactions = transactions;
    }

    public List<DocumentData> getDocuments() {
        return documents;
    }

    public void setDocuments(List<DocumentData> documents) {
        this.documents = documents;
    }

    public List<BankAccountData> getBankAccounts() {
        return bankAccounts;
    }

    public void setBankAccounts(List<BankAccountData> bankAccounts) {
        this.bankAccounts = bankAccounts;
    }

    public List<BankTransactionData> getBankTransactions() {
        return bankTransactions;
    }

    public void setBankTransactions(List<BankTransactionData> bankTransactions) {
        this.bankTransactions = bankTransactions;
    }

    public Map<String, Long> getSequences() {
        return sequences;
    }

    public void setSequences(Map<String, Long> sequences) {
        this.sequences = sequences;
    }

    public static class OrganizationData {
        private Long id;
        private String slug;
        private String name;
        private String type;
        private String website;
        private AddressData address;
        private Long rootBommelId;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getSlug() {
            return slug;
        }

        public void setSlug(String slug) {
            this.slug = slug;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getWebsite() {
            return website;
        }

        public void setWebsite(String website) {
            this.website = website;
        }

        public AddressData getAddress() {
            return address;
        }

        public void setAddress(AddressData address) {
            this.address = address;
        }

        public Long getRootBommelId() {
            return rootBommelId;
        }

        public void setRootBommelId(Long rootBommelId) {
            this.rootBommelId = rootBommelId;
        }
    }

    public static class AddressData {
        private String plz;
        private String city;
        private String street;
        private String number;
        private String additionalLine;

        public String getPlz() {
            return plz;
        }

        public void setPlz(String plz) {
            this.plz = plz;
        }

        public String getCity() {
            return city;
        }

        public void setCity(String city) {
            this.city = city;
        }

        public String getStreet() {
            return street;
        }

        public void setStreet(String street) {
            this.street = street;
        }

        public String getNumber() {
            return number;
        }

        public void setNumber(String number) {
            this.number = number;
        }

        public String getAdditionalLine() {
            return additionalLine;
        }

        public void setAdditionalLine(String additionalLine) {
            this.additionalLine = additionalLine;
        }
    }

    public static class MemberData {
        private Long id;
        private String email;
        private String keycloakId;
        private String firstName;
        private String lastName;
        private List<Long> organizationIds;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getKeycloakId() {
            return keycloakId;
        }

        public void setKeycloakId(String keycloakId) {
            this.keycloakId = keycloakId;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public List<Long> getOrganizationIds() {
            return organizationIds;
        }

        public void setOrganizationIds(List<Long> organizationIds) {
            this.organizationIds = organizationIds;
        }
    }

    public static class BommelData {
        private Long id;
        private String name;
        private Long parentId;
        private String emoji;
        private Long responsibleMemberId;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public Long getParentId() {
            return parentId;
        }

        public void setParentId(Long parentId) {
            this.parentId = parentId;
        }

        public String getEmoji() {
            return emoji;
        }

        public void setEmoji(String emoji) {
            this.emoji = emoji;
        }

        public Long getResponsibleMemberId() {
            return responsibleMemberId;
        }

        public void setResponsibleMemberId(Long responsibleMemberId) {
            this.responsibleMemberId = responsibleMemberId;
        }
    }

    public static class TransactionData {
        private Long id;
        private Long organizationId;
        private Long bommelId;
        private String name;
        private String total;
        private String currencyCode;
        private String transactionTime;
        private String status;
        private Boolean privatelyPaid;
        private String createdBy;
        private String senderName;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public Long getOrganizationId() {
            return organizationId;
        }

        public void setOrganizationId(Long organizationId) {
            this.organizationId = organizationId;
        }

        public Long getBommelId() {
            return bommelId;
        }

        public void setBommelId(Long bommelId) {
            this.bommelId = bommelId;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getTotal() {
            return total;
        }

        public void setTotal(String total) {
            this.total = total;
        }

        public String getCurrencyCode() {
            return currencyCode;
        }

        public void setCurrencyCode(String currencyCode) {
            this.currencyCode = currencyCode;
        }

        public String getTransactionTime() {
            return transactionTime;
        }

        public void setTransactionTime(String transactionTime) {
            this.transactionTime = transactionTime;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public Boolean getPrivatelyPaid() {
            return privatelyPaid;
        }

        public void setPrivatelyPaid(Boolean privatelyPaid) {
            this.privatelyPaid = privatelyPaid;
        }

        public String getCreatedBy() {
            return createdBy;
        }

        public void setCreatedBy(String createdBy) {
            this.createdBy = createdBy;
        }

        public String getSenderName() {
            return senderName;
        }

        public void setSenderName(String senderName) {
            this.senderName = senderName;
        }
    }

    /**
     * A test receipt (Document). Optionally linked to an existing transaction via {@code transactionId} so it appears
     * in the receipts view and the receipt-review drawer. No file is stored in S3 — the file endpoint simply returns
     * 404 for these, which the UI handles gracefully (no preview).
     */
    public static class DocumentData {
        private Long id;
        private Long organizationId;
        private Long bommelId;
        private Long transactionId;
        private String name;
        private String total;
        private String currencyCode;
        private String transactionTime;
        private String fileName;
        private String fileContentType;
        private Long fileSize;
        private String documentStatus;
        private String analysisStatus;
        private String direction;
        private String extractionSource;
        private String uploadedBy;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public Long getOrganizationId() {
            return organizationId;
        }

        public void setOrganizationId(Long organizationId) {
            this.organizationId = organizationId;
        }

        public Long getBommelId() {
            return bommelId;
        }

        public void setBommelId(Long bommelId) {
            this.bommelId = bommelId;
        }

        public Long getTransactionId() {
            return transactionId;
        }

        public void setTransactionId(Long transactionId) {
            this.transactionId = transactionId;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getTotal() {
            return total;
        }

        public void setTotal(String total) {
            this.total = total;
        }

        public String getCurrencyCode() {
            return currencyCode;
        }

        public void setCurrencyCode(String currencyCode) {
            this.currencyCode = currencyCode;
        }

        public String getTransactionTime() {
            return transactionTime;
        }

        public void setTransactionTime(String transactionTime) {
            this.transactionTime = transactionTime;
        }

        public String getFileName() {
            return fileName;
        }

        public void setFileName(String fileName) {
            this.fileName = fileName;
        }

        public String getFileContentType() {
            return fileContentType;
        }

        public void setFileContentType(String fileContentType) {
            this.fileContentType = fileContentType;
        }

        public Long getFileSize() {
            return fileSize;
        }

        public void setFileSize(Long fileSize) {
            this.fileSize = fileSize;
        }

        public String getDocumentStatus() {
            return documentStatus;
        }

        public void setDocumentStatus(String documentStatus) {
            this.documentStatus = documentStatus;
        }

        public String getAnalysisStatus() {
            return analysisStatus;
        }

        public void setAnalysisStatus(String analysisStatus) {
            this.analysisStatus = analysisStatus;
        }

        public String getDirection() {
            return direction;
        }

        public void setDirection(String direction) {
            this.direction = direction;
        }

        public String getExtractionSource() {
            return extractionSource;
        }

        public void setExtractionSource(String extractionSource) {
            this.extractionSource = extractionSource;
        }

        public String getUploadedBy() {
            return uploadedBy;
        }

        public void setUploadedBy(String uploadedBy) {
            this.uploadedBy = uploadedBy;
        }
    }

    /**
     * A test bank account. A single seed {@link app.hopps.bankimport.domain.BankImport} is created per account by the
     * loader so bank transactions (which require an import FK) can reference it.
     */
    public static class BankAccountData {
        private Long id;
        private Long organizationId;
        private Long bommelId;
        private String name;
        private String iban;
        private String bic;
        private String bankName;
        private String accountHolder;
        private String currency;
        private String openingBalance;
        private String openingBalanceDate;
        private String description;
        private String color;
        private String createdBy;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public Long getOrganizationId() {
            return organizationId;
        }

        public void setOrganizationId(Long organizationId) {
            this.organizationId = organizationId;
        }

        public Long getBommelId() {
            return bommelId;
        }

        public void setBommelId(Long bommelId) {
            this.bommelId = bommelId;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getIban() {
            return iban;
        }

        public void setIban(String iban) {
            this.iban = iban;
        }

        public String getBic() {
            return bic;
        }

        public void setBic(String bic) {
            this.bic = bic;
        }

        public String getBankName() {
            return bankName;
        }

        public void setBankName(String bankName) {
            this.bankName = bankName;
        }

        public String getAccountHolder() {
            return accountHolder;
        }

        public void setAccountHolder(String accountHolder) {
            this.accountHolder = accountHolder;
        }

        public String getCurrency() {
            return currency;
        }

        public void setCurrency(String currency) {
            this.currency = currency;
        }

        public String getOpeningBalance() {
            return openingBalance;
        }

        public void setOpeningBalance(String openingBalance) {
            this.openingBalance = openingBalance;
        }

        public String getOpeningBalanceDate() {
            return openingBalanceDate;
        }

        public void setOpeningBalanceDate(String openingBalanceDate) {
            this.openingBalanceDate = openingBalanceDate;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getColor() {
            return color;
        }

        public void setColor(String color) {
            this.color = color;
        }

        public String getCreatedBy() {
            return createdBy;
        }

        public void setCreatedBy(String createdBy) {
            this.createdBy = createdBy;
        }
    }

    /** A test bank transaction. Negative amount = outgoing (expense), positive = incoming (income). */
    public static class BankTransactionData {
        private Long id;
        private Long bankAccountId;
        private String bookingDate;
        private String valueDate;
        private String amount;
        private String currency;
        private String purpose;
        private String counterpartyName;
        private String counterpartyIban;
        private String transactionType;
        private String status;
        private String matchedAmount;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public Long getBankAccountId() {
            return bankAccountId;
        }

        public void setBankAccountId(Long bankAccountId) {
            this.bankAccountId = bankAccountId;
        }

        public String getBookingDate() {
            return bookingDate;
        }

        public void setBookingDate(String bookingDate) {
            this.bookingDate = bookingDate;
        }

        public String getValueDate() {
            return valueDate;
        }

        public void setValueDate(String valueDate) {
            this.valueDate = valueDate;
        }

        public String getAmount() {
            return amount;
        }

        public void setAmount(String amount) {
            this.amount = amount;
        }

        public String getCurrency() {
            return currency;
        }

        public void setCurrency(String currency) {
            this.currency = currency;
        }

        public String getPurpose() {
            return purpose;
        }

        public void setPurpose(String purpose) {
            this.purpose = purpose;
        }

        public String getCounterpartyName() {
            return counterpartyName;
        }

        public void setCounterpartyName(String counterpartyName) {
            this.counterpartyName = counterpartyName;
        }

        public String getCounterpartyIban() {
            return counterpartyIban;
        }

        public void setCounterpartyIban(String counterpartyIban) {
            this.counterpartyIban = counterpartyIban;
        }

        public String getTransactionType() {
            return transactionType;
        }

        public void setTransactionType(String transactionType) {
            this.transactionType = transactionType;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getMatchedAmount() {
            return matchedAmount;
        }

        public void setMatchedAmount(String matchedAmount) {
            this.matchedAmount = matchedAmount;
        }
    }
}
