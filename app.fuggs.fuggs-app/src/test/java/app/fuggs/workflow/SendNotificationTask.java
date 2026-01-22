package app.fuggs.workflow;

import jakarta.enterprise.context.ApplicationScoped;

/**
 * Example SystemTask that sends a notification (simulated).
 */
@ApplicationScoped
public class SendNotificationTask extends SystemTask
{
	@Override
	public String getTaskName()
	{
		return "SendNotification";
	}

	@Override
	protected void doExecute(WorkflowInstance instance)
	{
		String recipient = instance.getVariable("recipient", String.class);
		Double total = instance.getVariable("total", Double.class);

		if (recipient == null)
		{
			throw new IllegalStateException("Recipient must be set");
		}

		// Simulate sending notification
		String message = String.format("Order total: %.2f", total != null ? total : 0.0);
		instance.setVariable("notificationSent", true);
		instance.setVariable("notificationMessage", message);
	}
}
