# fin-narrator

## Setup

Put your OpenAI API key into the [.env](.env),
using `QUARKUS_LANGCHAIN4J_OPENAI_API_KEY=<your api key here>`.

## Test data

Here is some test receipt data:

```json
{
    "total": 3.36,
    "subTotal": 3.14,
    "storeName": "Kaufland",
    "storeAddress": {
        "countryOrRegion": "DE",
        "postalCode": 85354,
        "state": "Bavaria",
        "city": "Freising",
        "road": "Gutenbergstraße",
        "houseNumber": 2
    }
}
```

```json
{
    "total": 32843.24,
    "store": "Azure Billing"
}
```

## Running the application in dev mode

You can run your application in dev mode that enables live coding using:

```shell script
./mvnw quarkus:dev
```

> **_NOTE:_**  Quarkus now ships with a Dev UI, which is available in dev mode only at <http://localhost:8080/q/dev/>.

## Packaging and running the application

The application can be packaged using:

```shell script
./mvnw package
```

It produces the `quarkus-run.jar` file in the `target/quarkus-app/` directory.
Be aware that it’s not an _über-jar_ as the dependencies are copied into the `target/quarkus-app/lib/` directory.

The application is now runnable using `java -jar target/quarkus-app/quarkus-run.jar`.

If you want to build an _über-jar_, execute the following command:

```shell script
./mvnw package -Dquarkus.package.jar.type=uber-jar
```

The application, packaged as an _über-jar_, is now runnable using `java -jar target/*-runner.jar`.

## Creating a native executable

You can create a native executable using:

```shell script
./mvnw package -Dnative
```

Or, if you don't have GraalVM installed, you can run the native executable build in a container using:

```shell script
./mvnw package -Dnative -Dquarkus.native.container-build=true
```

You can then execute your native executable with: `./target/fin-narrator-1.0.0-SNAPSHOT-runner`

If you want to learn more about building native executables, please consult <https://quarkus.io/guides/maven-tooling>.
