import filenames from '../../../../data/filenames.json';
import ImageLoader from './ImageLoader';

const preloadImages = () => {
  for (const filename of filenames) {
    ImageLoader.loadImageRaw(filename);
  }
};

export default { preloadImages };
