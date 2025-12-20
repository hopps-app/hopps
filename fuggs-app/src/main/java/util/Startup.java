package util;

import java.util.Date;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;

import io.quarkus.runtime.LaunchMode;
import io.quarkus.runtime.StartupEvent;
import model.Bommel;
import model.Todo;

@ApplicationScoped
public class Startup
{
	/**
	 * This method is executed at the start of your application
	 */
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

			Bommel root = new Bommel();
			root.emoji = "🏛️";
			root.title = "Verein";
			root.persist();

			Bommel jugend = new Bommel();
			jugend.emoji = "👦";
			jugend.title = "Jugend";
			jugend.parent = root;
			jugend.persist();

			Bommel orchester = new Bommel();
			orchester.emoji = "🎺";
			orchester.title = "Orchester";
			orchester.parent = root;
			orchester.persist();

			Bommel anfaenger = new Bommel();
			anfaenger.emoji = "🌱";
			anfaenger.title = "Anfaenger";
			anfaenger.parent = jugend;
			anfaenger.persist();
		}
	}
}
