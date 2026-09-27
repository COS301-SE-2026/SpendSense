from PIL import Image
import pytest
from ocr.extraction import (
    extract_receipt_details,
    find_receipt_date,
    normalise_amount,
    parse_receipt_lines,
)

def test_extracts_standard_south_african_receipt():
    lines=[
        "SHOPRITE",
        "21/09/2026",
        "Bread R 18.99",
        "Milk R 24.99",
        "SUBTOTAL R 43.98",
        "VAT R 5.74",
        "TOTAL R 49.72",
        "Thank you!",
    ]
    result=parse_receipt_lines(lines,0.94)
    assert result["merchant"]=="SHOPRITE"
    assert result["receipt_date"]=="2026-09-21"
    assert result["total"]=="49.72"
    assert result["currency"]=="ZAR"
    assert result["confidence"]==0.94
    assert result["warnings"]==[]

def test_extracts_iso_date():
    result=find_receipt_date(["DATE: 2026-09-21"])
    assert result=="2026-09-21"

def test_extracts_date_with_slashes():
    result=find_receipt_date(["DATE: 2026/09/21"])
    assert result=="2026-09-21"

def test_rejects_invalid_calendar_date():
    result=find_receipt_date(["DATE: 31/02/2026"])
    assert result is None

def test_normalises_decimal_amount():
    assert normalise_amount("123.45")=="123.45"

def test_normalises_comma_decimal_amount():
    assert normalise_amount("123,45")=="123.45"

def test_normalises_thousands_separator():
    assert normalise_amount("1,234.56")=="1234.56"

def test_normalises_spaced_thousands_separator():
    assert normalise_amount("1 234.56")=="1234.56"

def test_rejects_zero_amount():
    assert normalise_amount("0.00") is None

def test_rejects_negative_amount():
    assert normalise_amount("-10.00") is None

def test_prefers_total_over_subtotal():
    result=parse_receipt_lines(
        [
            "PICK N PAY",
            "DATE 21/09/2026",
            "SUBTOTAL R 100.00",
            "VAT R 15.00",
            "TOTAL R 115.00",
        ],
        0.95,
    )
    assert result["total"]=="115.00"

def test_extracts_grand_total():
    result=parse_receipt_lines(
        ["WOOLWORTHS","GRAND TOTAL ZAR 250.50"],
        0.95,
    )
    assert result["total"]=="250.50"
    assert result["currency"]=="ZAR"

def test_warns_about_multiple_totals():
    result=parse_receipt_lines(
        [
            "SPAR",
            "TOTAL R 100.00",
            "TOTAL R 150.00",
        ],
        0.90,
    )
    assert result["total"] is None
    assert "Multiple possible receipt totals were found." in result["warnings"]

def test_warns_when_total_is_missing():
    result=parse_receipt_lines(
        ["SHOPRITE","21/09/2026","Bread R 25.00"],
        0.90,
    )
    assert result["total"] is None
    assert "Receipt total could not be identified." in result["warnings"]

def test_warns_when_date_is_missing():
    result=parse_receipt_lines(
        ["SHOPRITE","TOTAL R 25.00"],
        0.90,
    )
    assert result["receipt_date"] is None
    assert "Receipt date could not be identified." in result["warnings"]

def test_warns_when_currency_is_missing():
    result=parse_receipt_lines(
        ["SHOPRITE","21/09/2026","TOTAL 25.00"],
        0.90,
    )
    assert result["currency"] is None
    assert "Currency could not be identified." in result["warnings"]

def test_warns_when_merchant_is_missing():
    result=parse_receipt_lines(
        ["RECEIPT","21/09/2026","TOTAL R 25.00"],
        0.90,
    )
    assert result["merchant"] is None
    assert "Merchant could not be identified." in result["warnings"]

def test_warns_about_low_confidence():
    result=parse_receipt_lines(
        ["SHOPRITE","21/09/2026","TOTAL R 25.00"],
        0.35,
    )
    assert result["confidence"]==0.35
    assert "Receipt text may be inaccurate. Please review all fields." in result["warnings"]

def test_extracts_amount_paid():
    result=parse_receipt_lines(
        ["STORE","AMOUNT PAID R 75.99"],
        0.90,
    )
    assert result["total"]=="75.99"

def test_returns_missing_details_for_empty_text():
    result=parse_receipt_lines([],0.0)
    assert result["merchant"] is None
    assert result["receipt_date"] is None
    assert result["total"] is None
    assert result["currency"] is None
    assert result["confidence"]==0.0
    assert len(result["warnings"])==5

def test_runs_tesseract_with_timeout(monkeypatch):
    captured={}
    def mock_image_to_data(image,**kwargs):
        captured.update(kwargs)
        return{
            "text":["SHOPRITE","TOTAL","R","49.72"],
            "conf":["95","93","92","90"],
            "page_num":[1,1,1,1],
            "block_num":[1,1,1,1],
            "par_num":[1,1,1,1],
            "line_num":[1,2,2,2],
        }
    monkeypatch.setattr(
        "ocr.extraction.pytesseract.image_to_data",
        mock_image_to_data,
    )
    image=Image.new("L",(100,100),"white")
    result=extract_receipt_details(image)
    assert captured["timeout"]==20
    assert captured["lang"]=="eng"
    assert captured["config"]=="--psm 6"
    assert result["merchant"]=="SHOPRITE"
    assert result["total"]=="49.72"
    assert result["confidence"]==0.93

def test_handles_empty_tesseract_output(monkeypatch):
    def mock_image_to_data(image,**kwargs):
        return{
            "text":[],
            "conf":[],
            "page_num":[],
            "block_num":[],
            "par_num":[],
            "line_num":[],
        }
    monkeypatch.setattr(
        "ocr.extraction.pytesseract.image_to_data",
        mock_image_to_data,
    )
    image=Image.new("L",(100,100),"white")
    result=extract_receipt_details(image)
    assert result["total"] is None
    assert result["confidence"]==0.0
    assert len(result["warnings"])==5

def test_tesseract_timeout_is_not_hidden(monkeypatch):
    def mock_image_to_data(image,**kwargs):
        raise RuntimeError("Tesseract process timeout")
    monkeypatch.setattr(
        "ocr.extraction.pytesseract.image_to_data",
        mock_image_to_data,
    )
    image=Image.new("L",(100,100),"white")
    with pytest.raises(RuntimeError,match="Tesseract process timeout"):
        extract_receipt_details(image)