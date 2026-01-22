package app.fuggs.az.document.ai.model;

import com.azure.ai.documentintelligence.models.AddressValue;

public class TradePartyHelper
{
	private TradePartyHelper()
	{
		// only call the static method
	}

	public static TradeParty fromAzure(AddressValue value)
	{
		return new TradeParty(
			null,
			value.getCountryRegion(),
			value.getPostalCode(),
			value.getState(),
			value.getCity(),
			value.getRoad() + " " + value.getHouseNumber(),
			value.getUnit(),
			null,
			null,
			null);
	}
}
