import torch

MODEL_PATH = r"oil_spill_seg_resnet_50_deeplab_v3%2B_80.pt"

print("Loading model...")

checkpoint = torch.load(
    MODEL_PATH,
    map_location="cpu",
    weights_only=False
)

print("\nCheckpoint type:")
print(type(checkpoint))

if isinstance(checkpoint, dict):
    print("\nCheckpoint keys:")
    for key in checkpoint.keys():
        print(" -", key)
else:
    print("\nCheckpoint is not a dictionary.")

print("\nDone.")