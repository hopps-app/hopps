# ENV Variables

To run this [docker-compose.yaml](docker-compose.yaml), you need to put
several environment variables (secrets, mostly) into [.env](.env).

Currently, these are:

| Name                               | Description                  |
|------------------------------------|------------------------------|
| HOPPS_AZURE_DOCUMENT_AI_ENDPOINT   | Azure Document AI Endpoint   |
| HOPPS_AZURE_DOCUMENT_AI_KEY        | Azure Document AI secret key |
| QUARKUS_LANGCHAIN4J_OPENAI_API_KEY | OpenAI API KEY               |

# Tags

To use a custom tag, put `TAG=<wanted tag>` into [.env](.env).
