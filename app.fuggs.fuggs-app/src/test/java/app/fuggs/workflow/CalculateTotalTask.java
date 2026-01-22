package app.fuggs.workflow;

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
	protected void doExecute(WorkflowInstance instance)
	{
		Double price = instance.getVariable("price", Double.class);
		Integer quantity = instance.getVariable("quantity", Integer.class);

		if (price == null || quantity == null)
		{
			throw new IllegalStateException("Price and quantity must be set");
		}

		double total = price * quantity;
		instance.setVariable("total", total);
	}
}
