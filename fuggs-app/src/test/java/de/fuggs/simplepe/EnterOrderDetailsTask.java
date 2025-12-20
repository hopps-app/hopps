package de.fuggs.simplepe;

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
	protected boolean validateInput(Chain chain, Map<String, Object> userInput)
	{
		if (!userInput.containsKey("price") || !userInput.containsKey("quantity"))
		{
			chain.setError("Price and quantity are required");
			return false;
		}

		Object priceObj = userInput.get("price");
		Object quantityObj = userInput.get("quantity");

		if (!(priceObj instanceof Number) || !(quantityObj instanceof Number))
		{
			chain.setError("Price and quantity must be numbers");
			return false;
		}

		double price = ((Number)priceObj).doubleValue();
		int quantity = ((Number)quantityObj).intValue();

		if (price <= 0 || quantity <= 0)
		{
			chain.setError("Price and quantity must be positive");
			return false;
		}

		return true;
	}

	@Override
	protected void processInput(Chain chain, Map<String, Object> userInput)
	{
		Number price = (Number)userInput.get("price");
		Number quantity = (Number)userInput.get("quantity");
		String recipient = (String)userInput.get("recipient");

		chain.setVariable("price", price.doubleValue());
		chain.setVariable("quantity", quantity.intValue());
		if (recipient != null)
		{
			chain.setVariable("recipient", recipient);
		}
	}
}
