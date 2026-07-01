import fitz
import sys
import os

def pdf_to_images(pdf_path, output_dir):
    try:
        doc = fitz.open(pdf_path)
        image_paths = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=300) # High resolution for better OCR
            output_path = os.path.join(output_dir, f"page_{page_num + 1}.png")
            pix.save(output_path)
            image_paths.append(output_path)
        print(','.join(image_paths))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_to_images.py <pdf_path> <output_dir>", file=sys.stderr)
        sys.exit(1)
    pdf_to_images(sys.argv[1], sys.argv[2])
