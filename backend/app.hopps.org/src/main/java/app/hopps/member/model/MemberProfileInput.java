package app.hopps.member.model;

/**
 * Details a member changes on their own profile. A name left out keeps its value; an empty phone number removes it.
 */
public record MemberProfileInput(String firstName, String lastName, String phoneNumber) {
}
