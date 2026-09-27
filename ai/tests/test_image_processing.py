from io import BytesIO
import pytest
from PIL import Image
from ocr.image_processing import ImageValidationError,process_receipt_image

def make_image(
    image_format:str="PNG",
    size:tuple[int,int]=(100,200),
    mode:str="RGB",
    color:str="white",
)->bytes:
    image=Image.new(mode,size,color)
    output=BytesIO()
    image.save(output,format=image_format)
    return output.getvalue()

def test_accepts_valid_png():
    image_bytes=make_image()
    result=process_receipt_image(image_bytes,"image/png")
    assert result.size==(100,200)
    assert result.mode=="L"

def test_accepts_valid_jpeg():
    image_bytes=make_image(image_format="JPEG")
    result=process_receipt_image(image_bytes,"image/jpeg")
    assert result.size==(100,200)
    assert result.mode=="L"

def test_rejects_empty_image():
    with pytest.raises(
        ImageValidationError,
        match="Receipt image is empty",
    ):
        process_receipt_image(b"")

def test_rejects_unsupported_image_format():
    image_bytes=make_image(image_format="GIF")
    with pytest.raises(
        ImageValidationError,
        match="Only JPEG and PNG",
    )as error:
        process_receipt_image(image_bytes)
    assert error.value.status_code==415

def test_rejects_incorrect_content_type():
    image_bytes=make_image(image_format="PNG")
    with pytest.raises(
        ImageValidationError,
        match="does not match its declared type",
    )as error:
        process_receipt_image(image_bytes,"image/jpeg")
    assert error.value.status_code==415

def test_rejects_corrupted_image():
    with pytest.raises(
        ImageValidationError,
        match="could not be decoded",
    ):
        process_receipt_image(
            b"this is not a receipt image",
            "image/png",
        )

def test_rejects_truncated_image():
    image_bytes=make_image(image_format="JPEG")
    with pytest.raises(
        ImageValidationError,
        match="could not be decoded",
    ):
        process_receipt_image(image_bytes[:100],"image/jpeg")

def test_rejects_oversized_file(monkeypatch):
    monkeypatch.setattr(
        "ocr.image_processing.MAX_FILE_SIZE",
        10,
    )
    image_bytes=make_image()
    with pytest.raises(
        ImageValidationError,
        match="exceeds the 8 MiB size limit",
    )as error:
        process_receipt_image(image_bytes)
    assert error.value.status_code==413

def test_accepts_file_at_size_limit(monkeypatch):
    image_bytes=make_image()
    monkeypatch.setattr(
        "ocr.image_processing.MAX_FILE_SIZE",
        len(image_bytes),
    )
    result=process_receipt_image(image_bytes)
    assert result.mode=="L"

def test_rejects_excessive_pixel_count(monkeypatch):
    monkeypatch.setattr(
        "ocr.image_processing.MAX_PIXELS",
        100,
    )
    image_bytes=make_image(size=(20,20))
    with pytest.raises(
        ImageValidationError,
        match="exceeds the 12 million pixel limit",
    )as error:
        process_receipt_image(image_bytes)
    assert error.value.status_code==413

def test_accepts_image_at_pixel_limit(monkeypatch):
    monkeypatch.setattr(
        "ocr.image_processing.MAX_PIXELS",
        400,
    )
    image_bytes=make_image(size=(20,20))
    result=process_receipt_image(image_bytes)
    assert result.size==(20,20)

def test_handles_transparent_png():
    image_bytes=make_image(
        image_format="PNG",
        size=(20,20),
        mode="RGBA",
        color=(0,0,0,0),
    )
    result=process_receipt_image(image_bytes,"image/png")
    assert result.mode=="L"
    assert result.getpixel((0,0))==255

def test_applies_exif_orientation():
    image=Image.new("RGB",(20,10),"white")
    exif=image.getexif()
    exif[274]=6
    output=BytesIO()
    image.save(output,format="JPEG",exif=exif)
    result=process_receipt_image(
        output.getvalue(),
        "image/jpeg",
    )
    assert result.size==(10,20)

def test_returns_processed_image_without_creating_files(tmp_path):
    image_bytes=make_image()
    before=list(tmp_path.iterdir())
    result=process_receipt_image(image_bytes)
    after=list(tmp_path.iterdir())
    assert result.mode=="L"
    assert before==after