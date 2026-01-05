# Setting Up Backend Development

## Potential Issues and Solutions

### Issue 1: `app.hopps.hopps` `pom.xml` Not Found

This issue occurs when the parent POM has not been built and installed in the local Maven repository (`.m2`).  
To resolve this, run the following command in `backend`:

```shell
mvn clean install -N
```

### Issue 2: `app.hopps.commons` JAR Not Found

This issue arises if the `commons` module has not been built and installed in the local Maven repository (`.m2`).  
To fix this, follow these steps in `backend`:

```shell
cd app.hopps.commons
mvn clean install
cd ../{project}
mvn quarkus:dev
```  

## API Client (bruno)

With the API client, you can easily make requests against both
local instances and the deployed environment(s).

Download [bruno](https://usebruno.com), then open the [backend/api](api) subfolder in it.
You will now see a new collection on the left side of the screen. On the top right of the screen, you can select the
environment you want to use, at the time of writing either "local dev" (quarkus services running locally) or "remote dev" (instance running at https://hopps.cloud/).

For authenticating your requests you need to:
 - click on the three dots next to the collection
 - select Settings
 - go to the Auth tab
 - click on "Get Access Token"
 - log in

You should see a success message, and can now make authenticated requests.
