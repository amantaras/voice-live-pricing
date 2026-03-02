"""
Fetch Azure Retail Prices for Voice Live and write to prices.json.
Runs at build time in GitHub Actions (no CORS issues server-side).
"""
import json
import urllib.request
import urllib.parse

API_BASE = "https://prices.azure.com/api/retail/prices"
FILTER = "serviceName eq 'Foundry Tools' and armRegionName eq 'eastus' and contains(productName, 'Speech')"


def fetch_all_pages():
    params = urllib.parse.urlencode({
        "currencyCode": "USD",
        "$filter": FILTER
    })
    url = f"{API_BASE}?{params}"
    all_items = []

    while url:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
        all_items.extend(data.get("Items", []))
        url = data.get("NextPageLink")

    return all_items


def main():
    print("Fetching Azure Retail Prices...")
    items = fetch_all_pages()
    print(f"Fetched {len(items)} price items")

    output = {
        "Items": items,
        "Count": len(items)
    }

    with open("prices.json", "w") as f:
        json.dump(output, f, indent=2)

    print("Wrote prices.json")


if __name__ == "__main__":
    main()
