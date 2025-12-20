package util;

import java.util.Date;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import io.quarkus.runtime.LaunchMode;
import io.quarkus.runtime.StartupEvent;
import model.Bommel;
import model.Todo;
import repository.BommelRepository;

@ApplicationScoped
public class Startup
{
	@Inject
	BommelRepository bommelRepository;

	/**
	 * This method is executed at the start of your application
	 */
	@Transactional
	public void start(@Observes StartupEvent evt)
	{
		// in DEV mode we seed some data
		if (LaunchMode.current() == LaunchMode.DEVELOPMENT)
		{
			Todo a = new Todo();
			a.task = "First item";
			a.persist();

			Todo b = new Todo();
			b.task = "Second item";
			b.completed = new Date();
			b.persist();

			// Only seed Bommels if none exist
			if (!bommelRepository.hasRoot())
			{
				Bommel root = new Bommel();
				root.icon = "home";
				root.title = "Verein";
				bommelRepository.persist(root);

				Bommel jugend = new Bommel();
				jugend.icon = "group";
				jugend.title = "Jugend";
				jugend.parent = root;
				bommelRepository.persist(jugend);

				Bommel orchester = new Bommel();
				orchester.icon = "music";
				orchester.title = "Orchester";
				orchester.parent = root;
				bommelRepository.persist(orchester);

				Bommel anfaenger = new Bommel();
				anfaenger.icon = "education";
				anfaenger.title = "Anfaenger";
				anfaenger.parent = jugend;
				bommelRepository.persist(anfaenger);
			}
		}
	}
}
