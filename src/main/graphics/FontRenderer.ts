import Color, { Colors } from '../types/Color';
import ImageLoader from './images/ImageLoader';
import { applyTransparentColor, replaceColors } from './images/ImageUtils';

// Fonts are partial ASCII table consisting of the "printable characters", 32 to 126
const MIN_CHARACTER_CODE = 32;  // ' '
const MAX_CHARACTER_CODE = 126; // '~'
const NUM_CHARACTERS = MAX_CHARACTER_CODE - MIN_CHARACTER_CODE + 1;
const DEFAULT_CHAR = ' ';

const CHARACTERS: string[] = [];
for (let c = MIN_CHARACTER_CODE; c <= MAX_CHARACTER_CODE; c++) {
  CHARACTERS.push(String.fromCodePoint(c));
}

interface FontDefinition {
  name: string,
  src: string,
  width: number,
  height: number
}

interface FontInstance extends FontDefinition {
  imageMap: { [char: string]: ImageBitmap }
}

const Fonts: Record<string, FontDefinition> = {
  PERFECT_DOS_VGA: {
    name: 'PERFECT_DOS_VGA',
    src: 'dos_perfect_vga_9x15_2',
    width: 9,
    height: 15
  }
};

const _loadedFonts: Record<string, FontInstance> = {};
const _imageMemos: Record<string, ImageBitmap> = {};

const renderFont = async (text: string, font: FontDefinition, color: Color): Promise<ImageBitmap> => {
  const key = _getMemoKey(text, font, color);
  if (!!_imageMemos[key]) {
    return _imageMemos[key];
  }

  const canvas = document.createElement('canvas');
  const context : CanvasRenderingContext2D = <any>canvas.getContext('2d');
  canvas.width = text.length * font.width;
  canvas.height = font.height;

  const fontInstance = await _loadFont(font);
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    const x = i * font.width;
    const imageBitmap : ImageBitmap = fontInstance.imageMap[c] || fontInstance.imageMap[DEFAULT_CHAR]; // TODO hacky placeholder
    context.drawImage(imageBitmap, x, 0, font.width, font.height);
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const imageBitmap = await replaceColors(imageData, { [Colors.BLACK]: color })
    .then(imageData => createImageBitmap(imageData));

  _imageMemos[key] = imageBitmap;
  return imageBitmap;
};

const _loadFont = async (definition: FontDefinition): Promise<FontInstance> => {
  if (_loadedFonts[definition.name]) {
    return _loadedFonts[definition.name];
  }

  const t1 = new Date().getTime();
  const width = NUM_CHARACTERS * definition.width;
  const imageData = await ImageLoader.loadImage(`fonts/${definition.src}`)
    .then(imageData => applyTransparentColor(imageData, Colors.WHITE));
  const imageBitmap = await createImageBitmap(imageData);
  const canvas: HTMLCanvasElement = document.createElement('canvas');
  canvas.width = width;
  canvas.height = definition.height;
  const context: CanvasRenderingContext2D = <any>canvas.getContext('2d');
  context.drawImage(imageBitmap, 0, 0);
  const imageMap: { [char: string]: ImageBitmap } = {};
  const promises: Promise<any>[] = [];

  for (const c of CHARACTERS) {
    promises.push(_getCharacterData(definition, context, c.charCodeAt(0))
      .then(imageData => createImageBitmap(imageData))
      .then(imageBitmap => {
        imageMap[c] = imageBitmap;
      }));
  }

  return Promise.all(promises)
    .then(() => {
      const fontInstance: FontInstance = {
        ...definition,
        imageMap
      };
      _loadedFonts[definition.name] = fontInstance;
      const t2 = new Date().getTime();
      console.debug(`Loaded font ${definition.name} in ${t2 - t1} ms`);
      return fontInstance;
    });
};

const _getCharacterData = async (definition: FontDefinition, context: CanvasRenderingContext2D, char: number) => {
  const offset = _getCharOffset(char);
  return context.getImageData(offset * definition.width, 0, definition.width, definition.height);
};

const _getCharOffset = (char: number) => {
  if (char >= MIN_CHARACTER_CODE && char <= MAX_CHARACTER_CODE) {
    return char - MIN_CHARACTER_CODE;
  }
  throw new Error(`invalid character code ${char}`);
};

const _getMemoKey = (text: string, font: FontDefinition, color: Color) => `${font.name}_${color}_${text}`;

export { renderFont };
export { Fonts, FontDefinition };
