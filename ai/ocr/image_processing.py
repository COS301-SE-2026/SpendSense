from io import BytesIO
from PIL import Image,ImageOps

MAX_FILE_SIZE=8*1024*1024
MAX_PIXELS=12_000_000

SUPPORTED_FORMATS={
    "JPEG":"image/jpeg",
    "PNG":"image/png",
}

class ImageValidationError(Exception):
    def __init__(self,message:str,status_code:int=422):
        super().__init__(message)
        self.message=message
        self.status_code=status_code

def validate_file_size(image_bytes:bytes):
    if not image_bytes:
        raise ImageValidationError("Receipt image is empty.")
    if len(image_bytes)>MAX_FILE_SIZE:
        raise ImageValidationError(
            "Receipt image exceeds the 8 MiB size limit.",
            status_code=413,
        )

def validate_image_format(image:Image.Image,content_type:str|None):
    image_format=image.format
    if image_format not in SUPPORTED_FORMATS:
        raise ImageValidationError(
            "Only JPEG and PNG receipt images are supported.",
            status_code=415,
        )
    expected_type=SUPPORTED_FORMATS[image_format]
    if content_type is not None and content_type!=expected_type:
        raise ImageValidationError(
            "Receipt image content does not match its declared type.",
            status_code=415,
        )

def validate_image_dimensions(image:Image.Image):
    width,height=image.size
    if width<=0 or height<=0:
        raise ImageValidationError(
            "Receipt image has invalid dimensions."
        )
    if width*height>MAX_PIXELS:
        raise ImageValidationError(
            "Receipt image exceeds the 12 million pixel limit.",
            status_code=413,
        )

def preprocess_image(image:Image.Image)->Image.Image:
    image=ImageOps.exif_transpose(image)
    if image.mode in("RGBA","LA")or "transparency" in image.info:
        image=image.convert("RGBA")
        background=Image.new(
            "RGBA",
            image.size,
            "white",
        )
        background.alpha_composite(image)
        image=background.convert("RGB")
    else:
        image=image.convert("RGB")
    image=ImageOps.grayscale(image)
    image=ImageOps.autocontrast(image)
    return image

def process_receipt_image(
    image_bytes:bytes,
    content_type:str|None=None,
)->Image.Image:
    validate_file_size(image_bytes)
    try:
        with Image.open(BytesIO(image_bytes))as image:
            validate_image_format(image,content_type)
            validate_image_dimensions(image)
            if getattr(image,"n_frames",1)!=1:
                raise ImageValidationError(
                    "Receipt image must contain exactly one frame."
                )
            image.verify()
        with Image.open(BytesIO(image_bytes))as image:
            validate_image_dimensions(image)
            image.load()
            return preprocess_image(image)
    except ImageValidationError:
        raise
    except(
        OSError,
        ValueError,
        SyntaxError,
        Image.DecompressionBombError,
    )as error:
        raise ImageValidationError(
            "Receipt image could not be decoded."
        )from error