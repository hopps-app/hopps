#!/bin/bash
TOKEN=$(curl -s -X POST "http://localhost:8554/realms/quarkus/protocol/openid-connect/token" -d "grant_type=password&client_id=quarkus-app&username=alice&password=alice" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "=== All Documents ==="
curl -s "http://localhost:8101/documents" -H "Authorization: Bearer $TOKEN"
echo ""
echo "=== Document count ==="
curl -s "http://localhost:8101/documents" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l
