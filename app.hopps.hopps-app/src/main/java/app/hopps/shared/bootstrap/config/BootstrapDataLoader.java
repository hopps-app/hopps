package app.hopps.shared.bootstrap.config;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.Constructor;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;

/**
 * Loads bootstrap configuration from YAML file.
 * <p>
 * The loader first checks for an external file (for Kubernetes deployments),
 * then falls back to the classpath resource (for local development).
 * <p>
 * External file locations checked (in order):
 * <ol>
 * <li>Path specified in {@code hopps.bootstrap.config-file} property</li>
 * <li>{@code config/bootstrap-data.yaml} (relative to working directory)</li>
 * </ol>
 * <p>
 * Classpath fallback: {@code bootstrap-data.yaml}
 */
@ApplicationScoped
public class BootstrapDataLoader
{
	private static final Logger LOG = LoggerFactory.getLogger(BootstrapDataLoader.class);
	private static final String CLASSPATH_FILE = "bootstrap-data.yaml";
	private static final String CONFIG_DIR_FILE = "config/bootstrap-data.yaml";

	@ConfigProperty(name = "hopps.bootstrap.config-file")
	Optional<String> configFilePath;

	@Produces
	@ApplicationScoped
	public BootstrapData loadBootstrapData()
	{
		// Try external file first (for Kubernetes)
		InputStream externalStream = tryLoadExternalFile();
		if (externalStream != null)
		{
			return parseYaml(externalStream, "external file");
		}

		// Fall back to classpath (for local development)
		InputStream classpathStream = Thread.currentThread().getContextClassLoader()
			.getResourceAsStream(CLASSPATH_FILE);
		if (classpathStream != null)
		{
			LOG.info("Loading bootstrap configuration from classpath: {}", CLASSPATH_FILE);
			return parseYaml(classpathStream, "classpath");
		}

		LOG.warn("No bootstrap configuration found, using empty config");
		return new BootstrapData();
	}

	/**
	 * Tries to load bootstrap configuration from external file.
	 *
	 * @return InputStream if file found, null otherwise
	 */
	private InputStream tryLoadExternalFile()
	{
		// Try configured path first
		if (configFilePath.isPresent())
		{
			Path path = Path.of(configFilePath.get());
			if (Files.exists(path))
			{
				LOG.info("Loading bootstrap configuration from configured path: {}", path);
				try
				{
					return new FileInputStream(path.toFile());
				}
				catch (FileNotFoundException e)
				{
					LOG.warn("Configured bootstrap file not readable: {}", path);
				}
			}
		}

		// Try config directory (Kubernetes mount point)
		Path configDirPath = Path.of(CONFIG_DIR_FILE);
		if (Files.exists(configDirPath))
		{
			LOG.info("Loading bootstrap configuration from: {}", configDirPath);
			try
			{
				return new FileInputStream(configDirPath.toFile());
			}
			catch (FileNotFoundException e)
			{
				LOG.warn("Config directory bootstrap file not readable: {}", configDirPath);
			}
		}

		return null;
	}

	/**
	 * Parses YAML from input stream.
	 */
	private BootstrapData parseYaml(InputStream inputStream, String source)
	{
		try (inputStream)
		{
			LoaderOptions loaderOptions = new LoaderOptions();
			Constructor constructor = new Constructor(BootstrapData.class, loaderOptions);
			Yaml yaml = new Yaml(constructor);
			BootstrapData data = yaml.load(inputStream);

			if (data == null)
			{
				LOG.warn("Bootstrap configuration from {} is empty", source);
				return new BootstrapData();
			}

			LOG.info("Loaded {} organizations and {} users from bootstrap configuration ({})",
				data.getOrganizations().size(), data.getUsers().size(), source);

			return data;
		}
		catch (Exception e)
		{
			LOG.error("Failed to parse bootstrap configuration from {}", source, e);
			return new BootstrapData();
		}
	}
}
