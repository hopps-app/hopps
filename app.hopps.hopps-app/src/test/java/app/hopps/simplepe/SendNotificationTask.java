package app.hopps.simplepe;

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
	protected void doExecute(Chain chain)
	{
		String recipient = chain.getVariable("recipient", String.class);
		Double total = chain.getVariable("total", Double.class);

		if (recipient == null)
		{
			throw new IllegalStateException("Recipient must be set");
		}

		// Simulate sending notification
		String message = String.format("Order total: %.2f", total != null ? total : 0.0);
		chain.setVariable("notificationSent", true);
		chain.setVariable("notificationMessage", message);
	}
}
