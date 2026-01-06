package app.hopps.shared;

/**
 * Constants for test security context. Use these IDs with @TestSecurity
 * annotation to simulate authenticated users in tests.
 */
public class TestSecurityHelper
{
	/**
	 * Test user ID for regular user tests
	 */
	public static final String TEST_USER = "test-user";

	/**
	 * Test user ID for admin user tests
	 */
	public static final String TEST_ADMIN = "test-admin";

	/**
	 * Test user ID for super admin tests
	 */
	public static final String TEST_SUPER_ADMIN = "super-admin-test";

	private TestSecurityHelper()
	{
		// Utility class
	}
}
