package app.fuggs.shared.util;

/**
 * Constants for flash message keys used throughout the application. These keys
 * correspond to message severity levels displayed to users.
 */
public final class FlashKeys
{
	/**
	 * Key for success messages (green notifications)
	 */
	public static final String SUCCESS = "success";

	/**
	 * Key for error messages (red notifications)
	 */
	public static final String ERROR = "error";

	/**
	 * Key for warning messages (yellow notifications)
	 */
	public static final String WARNING = "warning";

	/**
	 * Key for informational messages (blue notifications)
	 */
	public static final String INFO = "info";

	private FlashKeys()
	{
		// Prevent instantiation
	}
}
