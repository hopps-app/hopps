package app.fuggs.workflow;

import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;

/**
 * Example UserTask for entering order details.
 */
@ApplicationScoped
public class EnterOrderDetailsTask extends UserTask
{
	@Override
	public String getTaskName()
	{
		return "EnterOrderDetails";
	}

	@Override
	protected boolean validateInput(WorkflowInstance instance, Map<String, Object> userInput)
	{
		if (!userInput.containsKey("price") || !userInput.containsKey("quantity"))
		{
			instance.setError("Price and quantity are required");
			return false;
		}

		Object priceObj = userInput.get("price");
		Object quantityObj = userInput.get("quantity");

		if (!(priceObj instanceof Number) || !(quantityObj instanceof Number))
		{
			instance.setError("Price and quantity must be numbers");
			return false;
		}

		double price = ((Number)priceObj).doubleValue();
		int quantity = ((Number)quantityObj).intValue();

		if (price <= 0 || quantity <= 0)
		{
			instance.setError("Price and quantity must be positive");
			return false;
		}

		return true;
	}

	@Override
	protected void processInput(WorkflowInstance instance, Map<String, Object> userInput)
	{
		Number price = (Number)userInput.get("price");
		Number quantity = (Number)userInput.get("quantity");
		String recipient = (String)userInput.get("recipient");

		instance.setVariable("price", price.doubleValue());
		instance.setVariable("quantity", quantity.intValue());
		if (recipient != null)
		{
			instance.setVariable("recipient", recipient);
		}
	}
}
