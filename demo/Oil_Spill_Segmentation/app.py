import os
import io
import sys

import numpy as np
import streamlit as st
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap

import torch
import torch.nn.functional as F

from PIL import Image


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_DIR = r"D:\sih\demo\Oil_Spill_Segmentation"

TRAINING_DIR = os.path.join(
    PROJECT_DIR,
    "training"
)

MODEL_PATH = os.path.join(
    PROJECT_DIR,
    "resnet_50_deeplab_v3+",
    "oil_spill_seg_resnet_50_deeplab_v3+_80.pt"
)

STATS_PATH = os.path.join(
    TRAINING_DIR,
    "image_stats.json"
)

ANCHOR_DIR = os.path.join(
    PROJECT_DIR,
    "sample_image_for_inference"
)

ANCHOR_IMAGE = "img_0814.jpg"


# ============================================================
# PYTHON PATH
# ============================================================

sys.path.insert(0, TRAINING_DIR)

from seg_models import ResNet50DeepLabV3Plus
from image_preprocessing import ImagePadder
from logger_utils import load_dict_from_json


# ============================================================
# SETTINGS
# ============================================================

NUM_CLASSES = 5

CLASS_NAMES = {
    0: "Sea Surface",
    1: "Oil Spill",
    2: "Oil Spill Look-alike",
    3: "Ship",
    4: "Land",
}

CLASS_COLORS = {
    0: [0, 0, 0],
    1: [0, 255, 255],
    2: [255, 0, 0],
    3: [153, 76, 0],
    4: [0, 153, 0],
}


# ============================================================
# PAGE CONFIG
# ============================================================

st.set_page_config(
    page_title="OilTrace",
    page_icon="🌊",
    layout="wide",
)


# ============================================================
# CUSTOM CSS
# ============================================================

st.markdown(
    """
    <style>

    .main-title {
        font-size: 42px;
        font-weight: 700;
        margin-bottom: 0;
    }

    .subtitle {
        font-size: 18px;
        color: #666;
        margin-top: 0;
    }

    .status-box {
        padding: 15px;
        border-radius: 10px;
        background-color: #f5f7fa;
        margin-bottom: 15px;
    }

    </style>
    """,
    unsafe_allow_html=True,
)


# ============================================================
# CHECK PROJECT FILES
# ============================================================

def check_project_files():

    missing = []

    if not os.path.exists(MODEL_PATH):
        missing.append(MODEL_PATH)

    if not os.path.exists(STATS_PATH):
        missing.append(STATS_PATH)

    if not os.path.exists(
        os.path.join(ANCHOR_DIR, ANCHOR_IMAGE)
    ):
        missing.append(
            os.path.join(ANCHOR_DIR, ANCHOR_IMAGE)
        )

    return missing


# ============================================================
# LOAD MODEL
# ============================================================

@st.cache_resource
def load_model():

    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    model = ResNet50DeepLabV3Plus(
        num_classes=NUM_CLASSES,
        pretrained=False,
    )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=device,
        weights_only=True,
    )

    model.load_state_dict(checkpoint)

    model.to(device)
    model.eval()

    return model, device


# ============================================================
# RESIZE INPUT TO MODEL WORKING SIZE
# ============================================================

def resize_to_model_size(image_array):

    """
    The existing M4D-trained model was tested with an
    image of approximately 650 x 1250 before padding.

    DARTIS images are commonly 640 x 640.

    Therefore, uploaded images are resized to the
    M4D working dimensions before the original
    ImagePadder is applied.
    """

    target_height = 650
    target_width = 1250

    image = Image.fromarray(image_array)

    image = image.resize(
        (target_width, target_height),
        Image.Resampling.BILINEAR,
    )

    return np.array(image)


# ============================================================
# INFERENCE
# ============================================================

def run_inference(image_array):

    # --------------------------------------------------------
    # Load model
    # --------------------------------------------------------

    model, device = load_model()

    # --------------------------------------------------------
    # Load normalization statistics
    # --------------------------------------------------------

    stats = load_dict_from_json(
        STATS_PATH
    )

    mean = float(stats["mean"])
    std = float(stats["std"])

    # --------------------------------------------------------
    # Resize uploaded image
    # --------------------------------------------------------

    image_resized = resize_to_model_size(
        image_array
    )

    # --------------------------------------------------------
    # Original M4D padding
    # --------------------------------------------------------

    image_padder = ImagePadder(
        ANCHOR_DIR,
        file_anchor_image=ANCHOR_IMAGE,
    )

    image_padded = image_padder.pad_image(
        image_resized
    )

    # --------------------------------------------------------
    # Normalize
    # --------------------------------------------------------

    image_preprocessed = (
        image_padded.astype(np.float32) / 255.0
    )

    image_preprocessed = (
        image_preprocessed - mean
    )

    image_preprocessed = (
        image_preprocessed / std
    )

    # --------------------------------------------------------
    # HWC -> NCHW
    # --------------------------------------------------------

    image_preprocessed = np.expand_dims(
        image_preprocessed,
        axis=0,
    )

    image_preprocessed = np.transpose(
        image_preprocessed,
        (0, 3, 1, 2),
    )

    # --------------------------------------------------------
    # Tensor
    # --------------------------------------------------------

    image_tensor = torch.tensor(
        image_preprocessed,
        dtype=torch.float32,
    ).to(device)

    # --------------------------------------------------------
    # Model inference
    # --------------------------------------------------------

    with torch.no_grad():

        pred_logits = model(
            image_tensor
        )

        pred_probs = F.softmax(
            pred_logits,
            dim=1,
        )

        pred_label = torch.argmax(
            pred_probs,
            dim=1,
        )

    # --------------------------------------------------------
    # Convert to NumPy
    # --------------------------------------------------------

    pred_label_arr = (
        pred_label
        .detach()
        .cpu()
        .numpy()
        .squeeze()
        .astype(np.uint8)
    )

    pred_probs_arr = (
        pred_probs
        .detach()
        .cpu()
        .numpy()
        .squeeze()
    )

    # --------------------------------------------------------
    # Remove padding
    # --------------------------------------------------------

    pad_top = 11
    pad_bottom = 11
    pad_left = 15
    pad_right = 15

    padded_height, padded_width = (
        pred_label_arr.shape
    )

    pred_label_arr = pred_label_arr[
        pad_top:padded_height - pad_bottom,
        pad_left:padded_width - pad_right,
    ]

    pred_probs_arr = pred_probs_arr[
        :,
        pad_top:padded_height - pad_bottom,
        pad_left:padded_width - pad_right,
    ]

    # --------------------------------------------------------
    # Return
    # --------------------------------------------------------

    return (
        pred_label_arr,
        pred_probs_arr,
    )


# ============================================================
# CREATE COLORED MASK
# ============================================================

def create_colored_mask(prediction):

    height, width = prediction.shape

    mask = np.zeros(
        (height, width, 3),
        dtype=np.uint8,
    )

    for class_id, color in CLASS_COLORS.items():

        mask[
            prediction == class_id
        ] = color

    return mask


# ============================================================
# CREATE OIL MASK
# ============================================================

def create_oil_mask(prediction):

    return prediction == 1


# ============================================================
# CREATE OIL OVERLAY
# ============================================================

def create_oil_overlay(
    image,
    oil_mask,
):

    overlay = image.copy()

    overlay[oil_mask] = [
        0,
        255,
        255,
    ]

    result = (
        0.65 * image.astype(np.float32)
        +
        0.35 * overlay.astype(np.float32)
    )

    return np.clip(
        result,
        0,
        255,
    ).astype(np.uint8)


# ============================================================
# RESIZE MASK TO ORIGINAL IMAGE
# ============================================================

def resize_mask_to_original(
    mask,
    original_shape,
):

    height = original_shape[0]
    width = original_shape[1]

    resized = Image.fromarray(
        mask.astype(np.uint8)
    ).resize(
        (width, height),
        Image.Resampling.NEAREST,
    )

    return np.array(resized)


# ============================================================
# MASK INTERPRETATION
# ============================================================

def show_mask_interpretation():

    colors = [
        "#000000",
        "#00FFFF",
        "#FF0000",
        "#994C00",
        "#009900",
    ]

    labels = [
        "Sea Surface",
        "Oil Spill",
        "Look-alike",
        "Ship",
        "Land",
    ]

    cmap = ListedColormap(
        colors,
        name="oiltrace_classes",
    )

    fig, ax = plt.subplots(
        figsize=(12, 1.5)
    )

    data = np.arange(
        NUM_CLASSES
    ).reshape(1, -1)

    ax.imshow(
        data,
        cmap=cmap,
        vmin=0,
        vmax=NUM_CLASSES - 1,
    )

    ax.set_xticks(
        np.arange(NUM_CLASSES)
    )

    ax.set_xticklabels(
        labels
    )

    ax.set_yticks([])

    ax.set_title(
        "Segmentation Class Interpretation"
    )

    st.pyplot(
        fig,
        use_container_width=True,
    )

    plt.close(fig)


# ============================================================
# APP INFO
# ============================================================

def app_info():

    st.markdown(
        '<p class="main-title">🌊 OilTrace</p>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<p class="subtitle">'
        'Satellite-Based Oil Spill Detection & Analysis'
        '</p>',
        unsafe_allow_html=True,
    )

    st.divider()

    st.write(
        """
        OilTrace is a prototype for detecting potential
        oil-spill regions in Sentinel-1 SAR imagery using
        semantic segmentation.
        """
    )

    # --------------------------------------------------------
    # Architecture
    # --------------------------------------------------------

    st.header("AI Model")

    col1, col2, col3 = st.columns(3)

    with col1:

        st.metric(
            "Architecture",
            "DeepLabV3+",
        )

    with col2:

        st.metric(
            "Encoder",
            "ResNet-50",
        )

    with col3:

        st.metric(
            "Classes",
            "5",
        )

    # --------------------------------------------------------
    # Classes
    # --------------------------------------------------------

    st.header("Segmentation Classes")

    for class_id, name in CLASS_NAMES.items():

        st.write(
            f"**{class_id} — {name}**"
        )

    # --------------------------------------------------------
    # Pipeline
    # --------------------------------------------------------

    st.header("AI Processing Pipeline")

    st.code(
        """
Sentinel-1 SAR Image
        ↓
Image Preprocessing
        ↓
ResNet-50 Encoder
        ↓
DeepLabV3+ Decoder
        ↓
5-Class Semantic Segmentation
        ↓
Oil Spill Class Extraction
        ↓
Spill Mask / Overlay
        """,
        language="text",
    )

    st.info(
        """
        Prototype note: the current checkpoint is a
        pre-trained M4D oil-spill segmentation model.
        Predictions on external datasets should be treated
        as prototype inference and not as validated accuracy.
        """
    )


# ============================================================
# INFERENCE APP
# ============================================================

def infer():

    st.markdown(
        '<p class="main-title">🌊 Oil Spill Detection</p>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<p class="subtitle">'
        'Semantic segmentation of SAR imagery'
        '</p>',
        unsafe_allow_html=True,
    )

    st.divider()

    # --------------------------------------------------------
    # Sidebar
    # --------------------------------------------------------

    with st.sidebar:

        st.header("⚙️ Model")

        missing_files = check_project_files()

        if len(missing_files) == 0:

            st.success(
                "Model files available"
            )

        else:

            st.error(
                "Missing model files"
            )

            for file in missing_files:

                st.code(file)

        st.write(
            "**Architecture**"
        )

        st.write(
            "ResNet-50 + DeepLabV3+"
        )

        st.write(
            "**Classes:** 5"
        )

        st.write(
            "**Device:** "
            +
            (
                "GPU"
                if torch.cuda.is_available()
                else "CPU"
            )
        )

        st.divider()

        image_file = st.file_uploader(
            "📡 Select SAR Image",
            type=[
                "jpg",
                "jpeg",
                "png",
            ],
        )

        run_button = st.button(
            "🚀 Run Inference",
            type="primary",
            use_container_width=True,
        )

    # --------------------------------------------------------
    # No image
    # --------------------------------------------------------

    if image_file is None:

        st.info(
            "Upload a Sentinel-1 SAR image "
            "from the sidebar to begin."
        )

        st.subheader(
            "Expected workflow"
        )

        st.write(
            """
            1. Upload SAR image
            2. Run segmentation
            3. Inspect predicted classes
            4. Identify potential oil-spill region
            5. Download segmentation mask
            """
        )

        return

    # --------------------------------------------------------
    # Load image
    # --------------------------------------------------------

    try:

        image = Image.open(
            image_file
        ).convert("RGB")

        image_array = np.array(
            image
        )

    except Exception as error:

        st.error(
            "Unable to read image."
        )

        st.exception(error)

        return

    # --------------------------------------------------------
    # Input information
    # --------------------------------------------------------

    st.subheader(
        "Input Image"
    )

    info1, info2, info3 = st.columns(3)

    with info1:

        st.metric(
            "Filename",
            image_file.name,
        )

    with info2:

        st.metric(
            "Width",
            f"{image_array.shape[1]} px",
        )

    with info3:

        st.metric(
            "Height",
            f"{image_array.shape[0]} px",
        )

    st.image(
        image_array,
        caption=image_file.name,
        use_container_width=True,
    )

    # --------------------------------------------------------
    # Run model
    # --------------------------------------------------------

    if not run_button:

        st.info(
            "Click **Run Inference** to process this image."
        )

        return

    # --------------------------------------------------------
    # Inference
    # --------------------------------------------------------

    with st.spinner(
        "Running DeepLabV3+ segmentation..."
    ):

        try:

            prediction, probabilities = (
                run_inference(
                    image_array
                )
            )

        except Exception as error:

            st.error(
                "Inference failed."
            )

            st.exception(error)

            return

    st.success(
        "Segmentation completed successfully."
    )

    # --------------------------------------------------------
    # Oil mask
    # --------------------------------------------------------

    oil_mask = create_oil_mask(
        prediction
    )

    oil_pixels = int(
        np.sum(oil_mask)
    )

    total_pixels = int(
        prediction.size
    )

    oil_percentage = (
        oil_pixels /
        total_pixels *
        100
    )

    # --------------------------------------------------------
    # Oil confidence
    # --------------------------------------------------------

    if oil_pixels > 0:

        oil_confidence = float(
            probabilities[1][oil_mask].mean()
        )

    else:

        oil_confidence = float(
            probabilities[1].max()
        )

    # --------------------------------------------------------
    # Prototype detection threshold
    # --------------------------------------------------------

    detected = (
        oil_pixels >= 50
    )

    # --------------------------------------------------------
    # Colored segmentation
    # --------------------------------------------------------

    colored_mask = create_colored_mask(
        prediction
    )

    # --------------------------------------------------------
    # Resize masks to original image
    # --------------------------------------------------------

    colored_mask_original = (
        resize_mask_to_original(
            colored_mask,
            image_array.shape,
        )
    )

    oil_mask_original = (
        resize_mask_to_original(
            oil_mask.astype(np.uint8),
            image_array.shape,
        ).astype(bool)
    )

    # --------------------------------------------------------
    # Overlay
    # --------------------------------------------------------

    overlay = create_oil_overlay(
        image_array,
        oil_mask_original,
    )

    # --------------------------------------------------------
    # RESULTS
    # --------------------------------------------------------

    st.divider()

    st.header(
        "🔍 Segmentation Results"
    )

    col1, col2, col3 = st.columns(3)

    with col1:

        st.image(
            image_array,
            caption="Original SAR Image",
            use_container_width=True,
        )

    with col2:

        st.image(
            colored_mask_original,
            caption="5-Class Segmentation",
            use_container_width=True,
        )

    with col3:

        st.image(
            overlay,
            caption="Potential Oil Spill",
            use_container_width=True,
        )

    # --------------------------------------------------------
    # Detection summary
    # --------------------------------------------------------

    st.divider()

    st.header(
        "📊 Detection Summary"
    )

    col1, col2, col3, col4 = st.columns(4)

    with col1:

        st.metric(
            "Spill Detected",
            "YES" if detected else "NO",
        )

    with col2:

        st.metric(
            "Oil Pixels",
            f"{oil_pixels:,}",
        )

    with col3:

        st.metric(
            "Spill Coverage",
            f"{oil_percentage:.3f}%",
        )

    with col4:

        st.metric(
            "Model Confidence",
            f"{oil_confidence * 100:.1f}%",
        )

    # --------------------------------------------------------
    # Class distribution
    # --------------------------------------------------------

    st.divider()

    st.header(
        "📈 Class Distribution"
    )

    for class_id, class_name in (
        CLASS_NAMES.items()
    ):

        count = int(
            np.sum(
                prediction == class_id
            )
        )

        percentage = (
            count /
            prediction.size *
            100
        )

        st.write(
            f"**{class_name}:** "
            f"{count:,} pixels "
            f"({percentage:.4f}%)"
        )

    # --------------------------------------------------------
    # Interpretation
    # --------------------------------------------------------

    st.divider()

    with st.expander(
        "🎨 View Class Interpretation"
    ):

        show_mask_interpretation()

    # --------------------------------------------------------
    # Download mask
    # --------------------------------------------------------

    st.divider()

    st.header(
        "⬇️ Export"
    )

    mask_image = Image.fromarray(
        colored_mask_original
    )

    buffer = io.BytesIO()

    mask_image.save(
        buffer,
        format="PNG",
    )

    st.download_button(
        "Download Segmentation Mask",
        data=buffer.getvalue(),
        file_name="oiltrace_segmentation.png",
        mime="image/png",
        use_container_width=True,
    )

    # --------------------------------------------------------
    # Technical information
    # --------------------------------------------------------

    with st.expander(
        "🔧 Technical Information"
    ):

        st.write(
            f"**Input:** "
            f"{image_array.shape[1]} × "
            f"{image_array.shape[0]} pixels"
        )

        st.write(
            f"**Model input:** "
            f"650 × 1250 pixels before padding"
        )

        st.write(
            f"**Prediction shape:** "
            f"{prediction.shape[1]} × "
            f"{prediction.shape[0]} pixels"
        )

        st.write(
            f"**Device:** {load_model()[1]}"
        )

        st.write(
            "**Normalization:** "
            f"mean={0.5185}, std={0.197}"
        )


# ============================================================
# MODE SELECTION
# ============================================================

APP_MODES = {
    "App Info": app_info,
    "Oil Spill Inference": infer,
}


# ============================================================
# MAIN
# ============================================================

def main():

    selected_mode = st.sidebar.selectbox(
        "Select Mode",
        list(APP_MODES.keys()),
    )

    APP_MODES[
        selected_mode
    ]()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()