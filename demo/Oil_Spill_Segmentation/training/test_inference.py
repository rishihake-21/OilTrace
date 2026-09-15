import sys
import os
import torch
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt

# Make sure Python can find the project modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from seg_models import ResNet50DeepLabV3Plus


# --------------------------------------------------
# Paths
# --------------------------------------------------

MODEL_PATH = r"D:\sih\demo\Oil_Spill_Segmentation\resnet_50_deeplab_v3+\oil_spill_seg_resnet_50_deeplab_v3+_80.pt"

IMAGE_PATH = r"D:\sih\data\dartis-2019\nc-0001-00-000001.jpg"

OUTPUT_PATH = r"D:\sih\prediction_result.png"


# --------------------------------------------------
# Settings
# --------------------------------------------------

NUM_CLASSES = 5
IMAGE_SIZE = 512

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("Device:", device)
print("Loading model...")


# --------------------------------------------------
# Build model
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

print("Loading image:")
print(IMAGE_PATH)

image = Image.open(IMAGE_PATH).convert("RGB")

original_image = image.copy()

image = image.resize((IMAGE_SIZE, IMAGE_SIZE))

image_array = np.array(image).astype(np.float32) / 255.0

# HWC -> CHW
image_tensor = torch.from_numpy(
    image_array.transpose(2, 0, 1)
).unsqueeze(0)

image_tensor = image_tensor.to(device)


# --------------------------------------------------
# Inference
# --------------------------------------------------

print("Running segmentation...")

with torch.no_grad():
    output = model(image_tensor)

prediction = torch.argmax(output, dim=1)[0]

prediction = prediction.cpu().numpy()

print("Prediction shape:", prediction.shape)
print("Predicted classes:", np.unique(prediction))


# --------------------------------------------------
# Save mask
# --------------------------------------------------

mask = (prediction == 1).astype(np.uint8) * 255

Image.fromarray(mask).save(
    r"D:\sih\prediction_mask.png"
)

print("Mask saved to:")
print(r"D:\sih\prediction_mask.png")


# --------------------------------------------------
# Create visualization
# --------------------------------------------------

plt.figure(figsize=(12, 5))

plt.subplot(1, 2, 1)
plt.imshow(original_image)
plt.title("Input SAR Image")
plt.axis("off")

plt.subplot(1, 2, 2)
plt.imshow(original_image)
plt.imshow(
    prediction,
    alpha=0.45,
    interpolation="nearest"
)
plt.title("Segmentation Prediction")
plt.axis("off")

plt.tight_layout()
plt.savefig(OUTPUT_PATH, dpi=150)

print("Visualization saved to:")
print(OUTPUT_PATH)

plt.show()