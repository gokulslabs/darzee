"""Extract the customer/order measurement tables from the Ladies Collections PDF."""
import json
import re
import sys
import pdfplumber

source, destination = sys.argv[1:3]
customers = []
current_customer = None
current_order = None

def heading(line):
    global current_customer, current_order
    text = line.strip()
    match = re.match(r"^([\d,]+)\.\s+(.+)$", text)
    if match:
        current_customer = {"number": int(match.group(1).replace(",", "")), "name": match.group(2), "phone": "", "bookNo": "", "address": "", "orders": []}
        customers.append(current_customer)
        current_order = None
        return
    if text.startswith("Phone:") and current_customer:
        fields = dict(part.strip().split(": ", 1) for part in text.split(" | ") if ": " in part)
        current_customer.update(phone=fields.get("Phone", ""), bookNo=fields.get("Book", ""), address=fields.get("Address", ""))
        return
    if " | Order " in text and current_customer:
        garment, rest = text.split(" | Order ", 1)
        order_no = rest.split(" |", 1)[0].strip()
        current_order = {"orderNo": order_no, "garment": garment.strip(), "measurements": []}
        current_customer["orders"].append(current_order)

with pdfplumber.open(source) as pdf:
    for page_number, page in enumerate(pdf.pages[1:], 2):
        tables = sorted(page.find_tables(), key=lambda table: table.bbox[1])
        lines = sorted(page.extract_text_lines(), key=lambda line: line["top"])
        previous_bottom = 0
        for table in tables:
            for line in lines:
                if previous_bottom <= line["top"] < table.bbox[1]:
                    heading(line["text"])
            if current_order is None:
                raise ValueError(f"Page {page_number} has an unassigned table")
            for row in table.extract():
                for label, value in ((row[0], row[1]), (row[2], row[3])):
                    if label and value:
                        current_order["measurements"].append({"label": label.replace("\n", " ").strip(), "value": value.replace("\n", " ").strip()})
            previous_bottom = table.bbox[3]
        for line in lines:
            if line["top"] >= previous_bottom and (not tables or line["top"] > tables[-1].bbox[3]):
                heading(line["text"])

with open(destination, "w") as output:
    json.dump({"source": source, "customers": customers}, output, indent=2)

print(json.dumps({"customers": len(customers), "orders": sum(len(c["orders"]) for c in customers), "measurements": sum(len(o["measurements"]) for c in customers for o in c["orders"]), "missingPhones": sum(not c["phone"] for c in customers), "emptyOrders": sum(not o["measurements"] for c in customers for o in c["orders"])}, indent=2))
