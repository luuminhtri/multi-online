import html
import requests

url = "https://thuthuatchoi.com/danh-sach-cac-nhan-vat-trong-ma-soi-ultimate-ultimate-werewolf-deluxe-edition.html"
response = requests.get(url)
print(html.unescape(response.text))
