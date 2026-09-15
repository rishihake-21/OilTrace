import sys
sys.path.insert(0, r"D:\sih\demo\Oil_Spill_Segmentation\training")




import os
import torch
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
import torchvision.transforms as transforms

# Project modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from seg_models import ResNet50DeepLabV3Plus
from image_preprocessing import ImagePadder


# --------------------------------------------------
# Paths
# --------------------------------------------------

MODEL_PATH = r"D:\sih\demo\Oil_Spill_Segmentation\resnet_50_deeplab_v3+\oil_spill_seg_resnet_50_deeplab_v3+_80.pt"

IMAGE_DIR = r"D:\sih\demo\Oil_Spill_Segmentation\sample_image_for_inference"

IMAGE_PATH = os.path.join(IMAGE_DIR, "img_0814.jpg")

OUTPUT_MASK = r"D:\sih\prediction_mask.png"
OUTPUT_RESULT = r"D:\sih\prediction_result.png"


# --------------------------------------------------
# Model settings
# --------------------------------------------------

NUM_CLASSES = 5

MEAN = 0.5185
STD = 0.197

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Device:", device)
print("Loading model...")


# --------------------------------------------------
# Load model
# --------------------------------------------------

model = ResNet50DeepLabV3Plus(
    num_classes=NUM_CLASSES,
    pretrained=False
)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device,
    weights_only=True
)

model.load_state_dict(checkpoint)

model.to(device)
model.eval()

print("Model loaded successfully.")


# --------------------------------------------------
# Load image
# --------------------------------------------------

print("Loading:", IMAGE_PATH)

image = np.array(Image.open(IMAGE_PATH).convert("RGB"))

print("Original image shape:", image.shape)


# --------------------------------------------------
# Apply original ImagePadder
# --------------------------------------------------

padder = ImagePadder(
    IMAGE_DIR,
    file_anchor_image="img_0814.jpg"
)

padded_image = padder.pad_image(image.copy())

print("Padded image shape:", padded_image.shape)


# --------------------------------------------------
# Original normalization
# --------------------------------------------------

image_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[MEAN, MEAN, MEAN],
        std=[STD, STD, STD]
    )
])

image_tensor = image_transform(
    padded_image
).unsqueeze(0)

image_tensor = image_tensor.to(device)

print("Tensor shape:", image_tensor.shape)


# --------------------------------------------------
# Inference
# --------------------------------------------------

print("Running segmentation...")

with torch.no_grad():
    output = model(image_tensor)

print("Model output shape:", output.shape)

prediction = torch.argmax(
    output,
    dim=1
)[0].cpu().numpy()

print("Prediction shape:", prediction.shape)
print("Predicted classes:", np.unique(prediction))

print("\nClass pixel counts:")
for class_id in range(NUM_CLASSES):
    count = np.sum(prediction == class_id)
    percentage = (count / prediction.size) * 100
    print(
        f"Class {class_id}: "
        f"{count} pixels "
        f"({percentage:.4f}%)"
    )


# --------------------------------------------------
# Save class mask
# --------------------------------------------------

Image.fromarray(
    prediction.astype(np.uint8)
).save(OUTPUT_MASK)

print("Mask saved:", OUTPUT_MASK)


# --------------------------------------------------
# Visualize
# --------------------------------------------------

plt.figure(figsize=(15, 5))

plt.subplot(1, 3, 1)
plt.imshow(image)
plt.title("Original SAR Image")
plt.axis("off")

plt.subplot(1, 3, 2)
plt.imshow(prediction, interpolation="nearest")
plt.title("5-Class Segmentation")
plt.axis("off")

plt.subplot(1, 3, 3)
plt.imshow(image)
plt.imshow(
    prediction,
    alpha=0.45,
    interpolation="nearest"
)
plt.title("Segmentation Overlay")
plt.axis("off")

plt.tight_layout()

plt.savefig(
    OUTPUT_RESULT,
    dpi=150,
    bbox_inches="tight"
)

print("Result saved:", OUTPUT_RESULT)

plt.show()