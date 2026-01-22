package app.fuggs.shared;

/**
 * Constants for test security context. Use these IDs with @TestSecurity
 * annotation to simulate authenticated users in tests.
 */
public class TestSecurityHelper
{
	/**
	 * Represents a test user named "Maria". This constant is used within test
	 * security contexts, typically with the @TestSecurity annotation, to
	 * simulate an authenticated user with the identifier "maria".
	 */
	public static final String TEST_USER_MARIA = "maria";

	private TestSecurityHelper()
	{
		// Utility class
	}
}
