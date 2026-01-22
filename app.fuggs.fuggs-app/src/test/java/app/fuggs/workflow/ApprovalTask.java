package app.fuggs.workflow;

import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;

/**
 * Example UserTask that requires manager approval.
 */
@ApplicationScoped
public class ApprovalTask extends UserTask
{
	@Override
	public String getTaskName()
	{
		return "ManagerApproval";
	}

	@Override
	protected boolean validateInput(WorkflowInstance instance, Map<String, Object> userInput)
	{
		// Must have approved field
		if (!userInput.containsKey("approved"))
		{
			instance.setError("Approval decision is required");
			return false;
		}
		return true;
	}

	@Override
	protected void processInput(WorkflowInstance instance, Map<String, Object> userInput)
	{
		Boolean approved = (Boolean)userInput.get("approved");
		String comment = (String)userInput.get("comment");

		instance.setVariable("approved", approved);
		if (comment != null)
		{
			instance.setVariable("approvalComment", comment);
		}

		if (!approved)
		{
			instance.setError("Request was rejected");
		}
	}
}
