import existingFilenames from '../../../../data/filenames.json';
import PaletteSwaps from '../../types/PaletteSwaps';
import { checkNotNull } from '../../utils/preconditions';
import ImageLoader from './ImageLoader';
import { applyTransparentColor, replaceColors } from './ImageUtils';

const filenameSet = new Set<string>(existingFilenames);

type ImageDataFunc = (imageData: ImageData) => Promise<ImageData>;

const _loadOptional = async (filename: string): Promise<ImageData | null> => {
  return ImageLoader.loadImage(filename)
    .catch(e => null);
};

const _loadFirst = async (filenames: string[]): Promise<ImageData> => {
  // Use the filename list, generated by filenames.js at build time, to verify which filename actually exists
  // before making an HTTP request for it
  const promises: Promise<ImageData | null>[] = filenames
    .filter(filename => filenameSet.has(`png/${filename}.png`))
    .map(filename => _loadOptional(filename));
  const results = await Promise.all(promises);
  const imageData = results.filter(p => !!p)[0];
  return checkNotNull(imageData, `Failed to load images: ${filenames}`);
};

type Props = {
  filename?: string,
  filenames?: string[]
  transparentColor: string,
  paletteSwaps?: PaletteSwaps,
  effects?: ImageDataFunc[]
};

class ImageBuilder {
  private readonly _props: Props;
  /**
   * @param effects A list of custom transformations to be applied to the image, in order
   */
  constructor(props: Props) {
    this._props = props;
  }

  build = async (): Promise<ImageBitmap> => {
    const { filename, transparentColor, paletteSwaps, effects } = this._props;
    let filenames: string[];
    if (this._props.filenames) {
      filenames = this._props.filenames;
    } else if (filename) {
      filenames = [filename];
    } else {
      throw new Error('No filenames were specified!');
    }

    let imageData = await _loadFirst(filenames)
      .then(imageData => applyTransparentColor(imageData, transparentColor))
      .then(imageData => replaceColors(imageData, (paletteSwaps || {})));

    for (const effect of (effects || [])) {
      imageData = await effect(imageData);
    }
    return createImageBitmap(imageData);
  };
}

export default ImageBuilder;
