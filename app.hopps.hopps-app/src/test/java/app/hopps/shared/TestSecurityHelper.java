package app.hopps.shared;

/**
 * Constants for test security context. Use these IDs with @TestSecurity
 * annotation to simulate authenticated users in tests.
 */
public class TestSecurityHelper
{
	/**
	 * Test user email for regular user tests (used as principal name
	 * in @TestSecurity)
	 */
	public static final String TEST_USER = "test-user@hopps.local";

	/**
	 * Test user email for admin user tests (used as principal name
	 * in @TestSecurity)
	 */
	public static final String TEST_ADMIN = "test-admin@hopps.local";

	/**
	 * Test user email for super admin tests (used as principal name
	 * in @TestSecurity)
	 */
	public static final String TEST_SUPER_ADMIN = "super-admin@hopps.local";

	private TestSecurityHelper()
	{
		// Utility class
	}
}
