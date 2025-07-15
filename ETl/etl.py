import csv
import requests
import time

# Step 1: Extract & Remove Duplicates
unique_books = {}
with open('isbnlist.csv', mode='r', newline='', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    for row in reader:
        isbn = row['isbn'].strip()
        title = row['title'].strip()
        if isbn not in unique_books:
            unique_books[isbn] = title

# Step 2: Save cleaned, de-duplicated list
with open('cleanedbooks.csv', mode='w', newline='', encoding='utf-8') as file:
    fieldnames = ['isbn', 'title']
    writer = csv.DictWriter(file, fieldnames=fieldnames)
    writer.writeheader()
    for isbn, title in unique_books.items():
        writer.writerow({'isbn': isbn, 'title': title})

print("✅ Cleaned and saved to 'cleanedbooks.csv'\n")

# Step 3: Enrich using OpenLibrary
books = []
with open('cleanedbooks.csv', mode='r', newline='', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    for row in reader:
        books.append({'isbn': row['isbn'], 'title': row['title']})

base_url = "https://openlibrary.org/api/books?bibkeys=ISBN:{}&format=json&jscmd=data"

for book in books:
    isbn = book['isbn']
    response = requests.get(base_url.format(isbn))
    data = response.json()
    key = f"ISBN:{isbn}"
    
    if key in data:
        authors = data[key].get("authors", [])
        if authors:
            book["author"] = authors[0]["name"]
        else:
            book["author"] = "Unknown"
    else:
        book["author"] = "Not Found"
    time.sleep(1)

# Step 4: Save enriched data
with open("cleanedbooks.csv", mode="w", newline="", encoding="utf-8") as file:
    fieldnames = ["isbn", "title", "author"]
    writer = csv.DictWriter(file, fieldnames=fieldnames)
    writer.writeheader()
    for book in books:
        writer.writerow(book)

print("✅ Final enriched data saved to 'enriched_books.csv'")
