package app.fuggs.shared.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JavaExtensionsTest
{
	@Test
	void shouldCapitaliseSimpleWord()
	{
		// Given
		String input = "hello";

		// When
		String result = JavaExtensions.capitalise(input);

		// Then
		assertEquals("Hello", result);
	}

	@Test
	void shouldCapitaliseMultipleWords()
	{
		// Given
		String input = "hello world test";

		// When
		String result = JavaExtensions.capitalise(input);

		// Then
		assertEquals("Hello World Test", result);
	}

	@Test
	void shouldHandleAlreadyCapitalisedWords()
	{
		// Given
		String input = "Hello World";

		// When
		String result = JavaExtensions.capitalise(input);

		// Then
		assertEquals("Hello World", result);
	}

	@Test
	void shouldHandleMixedCase()
	{
		// Given
		String input = "hELLO wORLD";

		// When
		String result = JavaExtensions.capitalise(input);

		// Then
		assertEquals("HELLO WORLD", result);
	}

	@Test
	void shouldHandleEmptyString()
	{
		// Given
		String input = "";

		// When
		String result = JavaExtensions.capitalise(input);

		// Then
		assertEquals("", result);
	}

	@Test
	void shouldHandleMultipleSpaces()
	{
		// Given
		String input = "hello    world";

		// When
		String result = JavaExtensions.capitalise(input);

		// Then
		assertEquals("Hello World", result);
	}

	@Test
	void shouldHandleLeadingAndTrailingSpaces()
	{
		// Given
		String input = "  hello world  ";

		// When
		String result = JavaExtensions.capitalise(input);

		// Then
		assertEquals("Hello World", result);
	}

	@Test
	void shouldHandleSingleCharacterWords()
	{
		// Given
		String input = "a b c";

		// When
		String result = JavaExtensions.capitalise(input);

		// Then
		assertEquals("A B C", result);
	}

	@Test
	void shouldHandleWhitespaceOnly()
	{
		// Given
		String input = "   ";

		// When
		String result = JavaExtensions.capitalise(input);

		// Then
		assertEquals("", result);
	}
}
