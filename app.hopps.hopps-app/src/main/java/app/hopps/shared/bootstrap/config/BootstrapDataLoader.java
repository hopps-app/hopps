package app.hopps.shared.bootstrap.config;

import java.io.InputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.Constructor;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;

/**
 * Loads bootstrap configuration from YAML file.
 */
@ApplicationScoped
public class BootstrapDataLoader
{
	private static final Logger LOG = LoggerFactory.getLogger(BootstrapDataLoader.class);
	private static final String BOOTSTRAP_DATA_FILE = "bootstrap-data.yaml";

	@Produces
	@ApplicationScoped
	public BootstrapData loadBootstrapData()
	{
		LOG.info("Loading bootstrap configuration from {}", BOOTSTRAP_DATA_FILE);

		try (InputStream inputStream = Thread.currentThread().getContextClassLoader()
			.getResourceAsStream(BOOTSTRAP_DATA_FILE))
		{
			if (inputStream == null)
			{
				LOG.warn("Bootstrap configuration file {} not found, using empty config",
					BOOTSTRAP_DATA_FILE);
				return new BootstrapData();
			}

			LoaderOptions loaderOptions = new LoaderOptions();
			Constructor constructor = new Constructor(BootstrapData.class, loaderOptions);
			Yaml yaml = new Yaml(constructor);
			BootstrapData data = yaml.load(inputStream);

			LOG.info("Loaded {} organizations and {} users from bootstrap configuration",
				data.getOrganizations().size(), data.getUsers().size());

			return data;
		}
		catch (Exception e)
		{
			LOG.error("Failed to load bootstrap configuration from {}", BOOTSTRAP_DATA_FILE, e);
			return new BootstrapData();
		}
	}
}
