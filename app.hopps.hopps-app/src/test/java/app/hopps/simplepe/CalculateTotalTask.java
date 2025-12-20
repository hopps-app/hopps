package app.hopps.simplepe;

import jakarta.enterprise.context.ApplicationScoped;

/**
 * Example SystemTask that calculates a total from price and quantity.
 */
@ApplicationScoped
public class CalculateTotalTask extends SystemTask
{
	@Override
	public String getTaskName()
	{
		return "CalculateTotal";
	}

	@Override
	protected void doExecute(Chain chain)
	{
		Double price = chain.getVariable("price", Double.class);
		Integer quantity = chain.getVariable("quantity", Integer.class);

		if (price == null || quantity == null)
		{
			throw new IllegalStateException("Price and quantity must be set");
		}

		double total = price * quantity;
		chain.setVariable("total", total);
	}
}
