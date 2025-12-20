package app.hopps.simplepe;

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
	protected boolean validateInput(Chain chain, Map<String, Object> userInput)
	{
		// Must have approved field
		if (!userInput.containsKey("approved"))
		{
			chain.setError("Approval decision is required");
			return false;
		}
		return true;
	}

	@Override
	protected void processInput(Chain chain, Map<String, Object> userInput)
	{
		Boolean approved = (Boolean)userInput.get("approved");
		String comment = (String)userInput.get("comment");

		chain.setVariable("approved", approved);
		if (comment != null)
		{
			chain.setVariable("approvalComment", comment);
		}

		if (!approved)
		{
			chain.setError("Request was rejected");
		}
	}

	@Override
	public String getAssignee(Chain chain)
	{
		return "manager";
	}
}
