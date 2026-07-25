import json

with open("your-downloaded-key.json") as f:
    data = json.load(f)

# json.dumps will correctly escape the real newlines in private_key as literal \n
print("GEE_SERVICE_ACCOUNT_EMAIL=" + data["client_email"])
print("GEE_SERVICE_ACCOUNT_KEY=" + json.dumps(data))