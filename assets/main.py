import numpy as np
import sys
import imageio.v3 as iio


def RGBMEncode(color):
    rgb = np.zeros_like(color)
    alpha = np.zeros((*color.shape[:-1], 1))
    color = np.clip(color / 6.0, 0, 1)
    alpha[..., 0] = np.clip(np.max(color, axis=-1, initial=1e-6), 0, 1)
    alpha = np.ceil(alpha * 255.0) / 255.0
    rgb = color / alpha
    return np.concatenate((rgb, alpha), axis=-1)

if (__name__ == "__main__"):
    if len(sys.argv) != 2:
        print("no filename given")
        exit(1)
    filename = sys.argv[1]
    color = iio.imread(filename, plugin="HDR-FI")
    rgbm = RGBMEncode(color)
    iio.imwrite("output-RGBM.png", rgbm[::-1], plugin="PNG-FI")
    exit(0)