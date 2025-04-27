package app.hopps.fin.bpmn;

import app.hopps.commons.DocumentType;
import app.hopps.fin.jpa.entities.TransactionRecord;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class SubmitService {

    @Inject
    @Named("Submit")
    Process<? extends Model> submitProcess;

    public String submitDocument(DocumentSubmissionRequest request) {
        TransactionRecord transactionRecord = new TransactionRecord();
        transactionRecord.setDocumentKey(request.documentKey);
        request.bommelId.ifPresent(transactionRecord::setBommelId);

        // FIXME: Type is unhandled

        Model model = submitProcess.createModel();

        Map<String, Object> params = new HashMap<>();
        params.put("privatelyPaid", request.privatelyPaid);
        params.put("transactionRecord", transactionRecord);

        model.fromMap(params);
        ProcessInstance<? extends Model> instance = submitProcess.createInstance(model);
        instance.start();
        return instance.id();
    }

    public record DocumentSubmissionRequest(
            String documentKey,
            Optional<Long> bommelId,
            Optional<DocumentType> type,
            boolean privatelyPaid,
            String submitterUserName) {
    }
}
