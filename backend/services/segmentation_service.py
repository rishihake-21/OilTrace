import sys
from pathlib import Path

import cv2
import numpy as np
import torch


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

ML_TRAINING_DIR = PROJECT_ROOT / "ml" / "training"
MODEL_PATH = (
    PROJECT_ROOT
    / "ml"
    / "models"
    / "resnet_50_deeplab_v3+"
    / "oil_spill_seg_resnet_50_deeplab_v3+_80.pt"
)

# Allow imports from the existing ML implementation
sys.path.insert(0, str(ML_TRAINING_DIR))

from seg_models import ResNet50DeepLabV3Plus
from image_preprocessing import ImagePadder


# ---------------------------------------------------------
# Model configuration
# ---------------------------------------------------------

NUM_CLASSES = 5
MEAN = 0.5185
STD = 0.197

# Class mapping used by the existing model
CLASS_NAMES = {
    0: "Sea Surface",
    1: "Oil Spill",
    2: "Look-alike",
    3: "Ship",
    4: "Land",
}


class SegmentationService:

    def __init__(self):
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        print(f"Segmentation device: {self.device}")
        print(f"Loading model: {MODEL_PATH}")

        self.model = ResNet50DeepLabV3Plus(
            num_classes=NUM_CLASSES,
            pretrained=False,
        )

        checkpoint = torch.load(
            MODEL_PATH,
            map_location=self.device,
        )

        self.model.load_state_dict(checkpoint)
        self.model.to(self.device)
        self.model.eval()

        print("Segmentation model loaded successfully.")

    def preprocess(self, image):
        """
        Apply the preprocessing expected by the existing model.
        """

        if image is None:
            raise ValueError("Invalid image.")

        # ImagePadder expects the original image dimensions.
        padder = ImagePadder(
            dir_images=str(image.parent)
            if isinstance(image, Path)
            else str(PROJECT_ROOT / "demo" / "Oil_Spill_Segmentation" / "sample_image_for_inference")
        )

        # If image is supplied as numpy array, create padding manually
        # using the same dimensions as the existing preprocessing.
        h, w = image.shape[:2]

        # Existing model works with dimensions divisible by 32.
        target_h = int(np.ceil(h / 32) * 32)
        target_w = int(np.ceil(w / 32) * 32)

        padded = cv2.copyMakeBorder(
            image,
            0,
            target_h - h,
            0,
            target_w - w,
            cv2.BORDER_CONSTANT,
            value=0,
        )

        # BGR -> RGB
        rgb = cv2.cvtColor(padded, cv2.COLOR_BGR2RGB)

        tensor = torch.from_numpy(
            rgb.astype(np.float32) / 255.0
        )

        # HWC -> CHW
        tensor = tensor.permute(2, 0, 1)

        # Existing model uses identical statistics for all channels.
        tensor = (tensor - MEAN) / STD

        tensor = tensor.unsqueeze(0)

        return tensor, (h, w)

    @torch.no_grad()
    def predict(self, image):
        """
        Run segmentation on an image.

        Returns:
            prediction mask
            class pixel counts
            original image size
        """

        tensor, original_shape = self.preprocess(image)

        tensor = tensor.to(self.device)

        output = self.model(tensor)

        prediction = torch.argmax(
            output,
            dim=1,
        )

        mask = prediction[0].cpu().numpy().astype(np.uint8)

        # Return to original image size
        original_h, original_w = original_shape

        mask = mask[:original_h, :original_w]

        # Pixel statistics
        unique, counts = np.unique(
            mask,
            return_counts=True,
        )

        class_counts = {
            CLASS_NAMES.get(int(cls), str(cls)): int(count)
            for cls, count in zip(unique, counts)
        }

        oil_mask = (
            mask == 1
        ).astype(np.uint8)

        oil_pixels = int(oil_mask.sum())

        total_pixels = int(mask.size)

        oil_percentage = (
            oil_pixels / total_pixels * 100
            if total_pixels > 0
            else 0
        )

        return {
            "mask": mask,
            "oil_mask": oil_mask,
            "class_counts": class_counts,
            "oil_pixels": oil_pixels,
            "oil_percentage": oil_percentage,
            "width": original_w,
            "height": original_h,
        }


# ---------------------------------------------------------
# Singleton model
# ---------------------------------------------------------

_service = None


def get_segmentation_service():

    global _service

    if _service is None:
        _service = SegmentationService()

    return _service