import urllib.request
import urllib.parse
import json

url = "http://localhost:8000/auth/login" # FastAPI prefix might be /api/v1/auth/login, wait let's check
url = "http://localhost:8000/api/v1/auth/login"
data = urllib.parse.urlencode({"username": "admin@rsquare.com", "password": "admin123"}).encode("utf-8")
req = urllib.request.Request(url, data=data)

try:
    with urllib.request.urlopen(req) as response:
        print("Status Code:", response.getcode())
        print("Response Body:", response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("Status Code:", e.code)
    print("Response Body:", e.read().decode("utf-8"))
except Exception as e:
    print("Error:", str(e))
