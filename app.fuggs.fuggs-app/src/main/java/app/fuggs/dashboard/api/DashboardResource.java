package app.fuggs.dashboard.api;

import io.quarkiverse.renarde.Controller;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import io.quarkus.security.Authenticated;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;

@Authenticated
@Path("/")
public class DashboardResource extends Controller
{
	@CheckedTemplate
	public static class Templates
	{
		private Templates()
		{
			// static
		}

		public static native TemplateInstance index();
	}

	@GET
	@Path("")
	public TemplateInstance index()
	{
		return Templates.index();
	}
}
