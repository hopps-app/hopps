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
}
