package app.fuggs.zugferd.model;

public class TradePartyHelper
{
	private TradePartyHelper()
	{
		// use static method
	}

	public static TradeParty fromTradeParty(org.mustangproject.TradeParty tradeparty)
	{
		return new TradeParty(tradeparty.getName(), tradeparty.getCountry(), tradeparty.getZIP(), null,
			tradeparty.getLocation(),
			tradeparty.getStreet(), tradeparty.getAdditionalAddress(), tradeparty.getTaxID(), tradeparty.getVatID(),
			tradeparty.getDescription());
	}
}
