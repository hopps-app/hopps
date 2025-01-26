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
