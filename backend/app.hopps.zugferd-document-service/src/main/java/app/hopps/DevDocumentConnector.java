package app.hopps;

import app.hopps.model.InvoiceData;
import io.quarkus.arc.profile.IfBuildProfile;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;

import javax.xml.xpath.XPathExpressionException;
import java.text.ParseException;

@ApplicationScoped
@IfBuildProfile("dev")
@Path("/zugferd/documents/scan")
public class DevDocumentConnector {
    @Inject
    ZugFerdService zugFerdService;

    @Path("/invoice")
    @POST
    public InvoiceData scanInvoice(String targetURL) throws XPathExpressionException, ParseException {
        return zugFerdService.scanInvoice(targetURL);
    }
}
