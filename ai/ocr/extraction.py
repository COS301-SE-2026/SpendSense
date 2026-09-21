from datetime import date
from decimal import Decimal,InvalidOperation
from PIL import Image
import pytesseract

OCR_TIMEOUT=20
LOW_CONFIDENCE_THRESHOLD=0.60

TOTAL_LABELS={
    "TOTAL",
    "GRAND TOTAL",
    "TOTAL PAID",
    "TOTAL AMOUNT",
    "TOTAL DUE",
    "AMOUNT PAID",
}

EXCLUDED_TOTAL_LABELS={
    "SUBTOTAL",
    "SUB TOTAL",
    "VAT",
    "TAX",
    "CHANGE",
    "DISCOUNT",
    "BALANCE",
    "CASH TENDERED",
    "CASH RECEIVED",
}

MERCHANT_EXCLUDED_LABELS={
    "RECEIPT",
    "TAX INVOICE",
    "INVOICE",
    "DATE",
    "TIME",
    "TOTAL",
    "SUBTOTAL",
    "VAT",
    "TAX",
    "TEL",
    "PHONE",
    "CASHIER",
    "THANK YOU",
    "TRANSACTION",
    "CARD NUMBER",
}

def normalise_amount(value:str)->str|None:
    cleaned=value.replace(" ","")
    if not cleaned:
        return None
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",")>cleaned.rfind("."):
            cleaned=cleaned.replace(".","").replace(",",".")
        else:
            cleaned=cleaned.replace(",","")
    elif "," in cleaned:
        if cleaned.count(",")==1 and len(cleaned.split(",")[-1])==2:
            cleaned=cleaned.replace(",",".")
        else:
            cleaned=cleaned.replace(",","")
    try:
        amount=Decimal(cleaned)
    except InvalidOperation:
        return None
    if not amount.is_finite() or amount<=0:
        return None
    if amount!=amount.quantize(Decimal("0.01")):
        return None
    return str(amount.quantize(Decimal("0.01")))

def parse_date(value:str)->str|None:
    cleaned=value.strip(".,:;()[]")
    separator=None
    if "/" in cleaned:
        separator="/"
    elif "-" in cleaned:
        separator="-"
    if separator is None:
        return None
    parts=cleaned.split(separator)
    if len(parts)!=3 or not all(part.isdigit() for part in parts):
        return None
    try:
        if len(parts[0])==4:
            year,month,day=map(int,parts)
        elif len(parts[2])==4:
            day,month,year=map(int,parts)
        else:
            return None
        return date(year,month,day).isoformat()
    except ValueError:
        return None

def find_receipt_date(lines:list[str])->str|None:
    for line in lines:
        for word in line.split():
            parsed=parse_date(word)
            if parsed is not None:
                return parsed
    return None

def normalise_label(line:str)->str:
    cleaned=line.upper()
    for character in ":;.,()[]":
        cleaned=cleaned.replace(character," ")
    return " ".join(cleaned.split())

def contains_label(line:str,labels:set[str])->bool:
    words=normalise_label(line).split()
    for label in labels:
        label_words=label.split()
        length=len(label_words)
        for index in range(len(words)-length+1):
            if words[index:index+length]==label_words:
                return True
    return False

def find_merchant(lines:list[str])->str|None:
    for line in lines[:8]:
        candidate=line.strip()
        if not candidate:
            continue
        if contains_label(candidate,MERCHANT_EXCLUDED_LABELS):
            continue
        if find_receipt_date([candidate]) is not None:
            continue
        if not any(character.isalpha() for character in candidate):
            continue
        if not any(
            len("".join(character for character in word if character.isalpha()))>=2
            for word in candidate.split()
        ):
            continue
        return candidate
    return None

def extract_amounts(line:str)->list[str]:
    words=line.split()
    amounts=[]
    for index,word in enumerate(words):
        cleaned=word.strip(".,:;()[]")
        upper=cleaned.upper()
        if upper in("R","ZAR","USD"):
            continue
        if upper.startswith("ZAR") and len(cleaned)>3:
            cleaned=cleaned[3:]
        elif upper.startswith("USD") and len(cleaned)>3:
            cleaned=cleaned[3:]
        elif upper.startswith("R") and len(cleaned)>1 and cleaned[1].isdigit():
            cleaned=cleaned[1:]
        amount=normalise_amount(cleaned)
        if amount is None:
            continue
        if index>0:
            previous=words[index-1].strip(".,:;()[]")
            if previous.isdigit() and len(previous)<=3:
                combined=normalise_amount(previous+" "+cleaned)
                if combined is not None:
                    if amounts and amounts[-1]==normalise_amount(previous):
                        amounts.pop()
                    amounts.append(combined)
                    continue
        amounts.append(amount)
    return amounts

def find_total(lines:list[str])->tuple[str|None,list[str]]:
    candidates=[]
    for line in lines:
        if not contains_label(line,TOTAL_LABELS):
            continue
        if contains_label(line,EXCLUDED_TOTAL_LABELS):
            continue
        amounts=extract_amounts(line)
        if amounts:
            candidates.append(amounts[-1])
    if not candidates:
        return None,["Receipt total could not be identified."]
    unique=list(dict.fromkeys(candidates))
    if len(unique)>1:
        return None,["Multiple possible receipt totals were found."]
    return unique[0],[]

def find_currency(lines:list[str])->str|None:
    for line in lines:
        for word in line.split():
            cleaned=word.strip(".,:;()[]")
            upper=cleaned.upper()
            if upper=="ZAR" or upper=="R":
                return "ZAR"
            if upper.startswith("ZAR") and upper[3:4].isdigit():
                return "ZAR"
            if upper.startswith("R") and upper[1:2].isdigit():
                return "ZAR"
            if upper=="USD":
                return "USD"
            if upper.startswith("USD") and upper[3:4].isdigit():
                return "USD"
    return None

def parse_receipt_lines(
    lines:list[str],
    confidence:float,
)->dict:
    cleaned=[line.strip() for line in lines if line.strip()]
    warnings=[]
    merchant=find_merchant(cleaned)
    receipt_date=find_receipt_date(cleaned)
    total,total_warnings=find_total(cleaned)
    currency=find_currency(cleaned)
    warnings.extend(total_warnings)
    if merchant is None:
        warnings.append("Merchant could not be identified.")
    if receipt_date is None:
        warnings.append("Receipt date could not be identified.")
    if currency is None:
        warnings.append("Currency could not be identified.")
    if confidence<LOW_CONFIDENCE_THRESHOLD:
        warnings.append("Receipt text may be inaccurate. Please review all fields.")
    return{
        "merchant":merchant,
        "receipt_date":receipt_date,
        "total":total,
        "currency":currency,
        "confidence":round(confidence,2),
        "warnings":warnings,
    }

def extract_receipt_details(image:Image.Image)->dict:
    data=pytesseract.image_to_data(
        image,
        lang="eng",
        config="--psm 6",
        output_type=pytesseract.Output.DICT,
        timeout=OCR_TIMEOUT,
    )
    grouped={}
    confidences=[]
    for index,word in enumerate(data["text"]):
        word=word.strip()
        if not word:
            continue
        key=(
            data["page_num"][index],
            data["block_num"][index],
            data["par_num"][index],
            data["line_num"][index],
        )
        grouped.setdefault(key,[]).append(word)
        try:
            score=float(data["conf"][index])
        except(ValueError,TypeError):
            continue
        if score>=0:
            confidences.append(score)
    lines=[" ".join(words) for words in grouped.values()]
    confidence=sum(confidences)/(len(confidences)*100) if confidences else 0.0
    return parse_receipt_lines(lines,confidence)