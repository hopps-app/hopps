package app.fuggs.shared.util;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import io.quarkus.qute.TemplateExtension;

/**
 * Add your custom Qute extension methods here.
 */
@TemplateExtension
public class JavaExtensions
{
	private static final DateTimeFormatter GERMAN_DATE_FORMATTER = DateTimeFormatter
		.ofPattern("dd.MM.yyyy HH:mm")
		.withLocale(Locale.GERMAN)
		.withZone(ZoneId.systemDefault());

	/**
	 * This registers the String.capitalise extension method
	 */
	public static String capitalise(String string)
	{
		StringBuilder sb = new StringBuilder();
		for (String part : string.split("\\s+"))
		{
			if (!sb.isEmpty())
			{
				sb.append(" ");
			}
			if (!part.isEmpty())
			{
				sb.append(part.substring(0, 1).toUpperCase());
				sb.append(part.substring(1));
			}
		}
		return sb.toString();
	}

	/**
	 * Format an Instant in German format (dd.MM.yyyy HH:mm)
	 */
	public static String formatGerman(Instant instant)
	{
		if (instant == null)
		{
			return "";
		}
		return GERMAN_DATE_FORMATTER.format(instant);
	}
}
