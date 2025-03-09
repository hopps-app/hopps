package app.hopps.fin.endpoint;

import app.hopps.fin.fga.FgaProxy;
import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.SecurityContext;

import java.math.BigDecimal;
import java.util.List;

@Path("/dashboard")
public class DashboardEndpoint {
    private final TransactionRecordRepository transactionRecordRepository;
    private final FgaProxy fgaProxy;
    private final SecurityContext securityContext;

    @Inject
    public DashboardEndpoint(TransactionRecordRepository transactionRecordRepository, FgaProxy fgaProxy,
            SecurityContext securityContext) {
        this.transactionRecordRepository = transactionRecordRepository;
        this.fgaProxy = fgaProxy;
        this.securityContext = securityContext;
    }

    @GET
    @Path("unpaid")
    @Produces(MediaType.APPLICATION_JSON)
    public BigDecimal getUnpaidInvoices() {
        List<Long> accessibleBommels = fgaProxy.getAccessibleBommels(securityContext.getUserPrincipal().getName());
        // FIXME: Amount due is probably wrong
        return transactionRecordRepository.findAll(accessibleBommels, false)
                .list()
                .stream()
                .map(TransactionRecord::getAmountDue)
                .reduce(BigDecimal::add)
                .orElse(BigDecimal.ZERO);
    }

    @GET
    @Path("revenue")
    @Produces(MediaType.APPLICATION_JSON)
    public BigDecimal getCurrentRevenue() {
        List<Long> accessibleBommels = fgaProxy.getAccessibleBommels(securityContext.getUserPrincipal().getName());
        return transactionRecordRepository.findAll(accessibleBommels, false)
                .list()
                .stream()
                .map(TransactionRecord::getTotal)
                .reduce(BigDecimal::add)
                .orElse(BigDecimal.ZERO);
    }
}
