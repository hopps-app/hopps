package app.hopps.dashboard.api;

import io.quarkiverse.renarde.Controller;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;

@Path("/")
public class DashboardResource extends Controller
{
	@CheckedTemplate
	public static class Templates
	{
		public static native TemplateInstance index();
	}

	@GET
	public TemplateInstance index()
	{
		return Templates.index();
	}
}
